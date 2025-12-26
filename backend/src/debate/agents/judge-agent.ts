/**
 * Judge Agent - Evaluates debate performance and determines a winner.
 */

import { Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { createOpenRouterChatModel, OpenRouterChatModelConfig } from './openrouter-chat-model';
import { OpeningStatements, DebateRound, Conclusions } from '../interfaces/debate.interface';
import { JudgeEvaluation } from '../interfaces/debate.interface';

export interface JudgeAgentConfig {
  model: string;
  apiKey: string;
  timeout?: number;
}

export class JudgeAgent {
  private readonly logger = new Logger(JudgeAgent.name);
  private chatModel: BaseChatModel;
  private modelName: string;

  constructor(config: JudgeAgentConfig) {
    this.modelName = config.model;
    const modelConfig: OpenRouterChatModelConfig = {
      model: config.model,
      apiKey: config.apiKey,
      temperature: 0.3, // Lower temperature for more consistent judging
      timeout: config.timeout || 120000,
    };
    this.chatModel = createOpenRouterChatModel(modelConfig);
  }

  /**
   * Evaluate the entire debate and provide scores and reasoning.
   */
  async evaluateDebate(
    topic: string,
    openingStatements: OpeningStatements,
    rebuttalRounds: DebateRound[],
    conclusions: Conclusions,
    customPrompt?: string,
  ): Promise<JudgeEvaluation> {
    const startTime = Date.now();
    this.logger.log(`Starting evaluation for debate with ${rebuttalRounds.length} rebuttal rounds`);

    // Build complete debate transcript
    let transcript = '=== OPENING STATEMENTS ===\n\n';
    transcript += `FOR (${openingStatements.yesStatement.model}):\n${openingStatements.yesStatement.content}\n\n`;
    transcript += `AGAINST (${openingStatements.noStatement.model}):\n${openingStatements.noStatement.content}\n\n`;

    transcript += '=== REBUTTAL ROUNDS ===\n\n';
    transcript += rebuttalRounds
      .map(
        (r) =>
          `Rebuttal Round ${r.round}:\n` +
          `FOR (${r.yesMessage.model}): ${r.yesMessage.content}\n\n` +
          `AGAINST (${r.noMessage.model}): ${r.noMessage.content}\n\n`,
      )
      .join('---\n\n');

    transcript += '=== CONCLUSIONS ===\n\n';
    transcript += `FOR (${conclusions.yesConclusion.model}):\n${conclusions.yesConclusion.content}\n\n`;
    transcript += `AGAINST (${conclusions.noConclusion.model}):\n${conclusions.noConclusion.content}\n\n`;

    const baseEvaluationCriteria = `Evaluate the debate based on:

1. MAIN POINTS: Analyze the main arguments presented by each debater throughout the entire debate (opening statements, rebuttals, and conclusions)

2. PRESENTATION QUALITY: Evaluate which side better presented their case. Consider:
   - Clarity and organization of arguments
   - Persuasiveness and rhetorical effectiveness
   - How well each side structured and delivered their points

3. DEFENSE QUALITY: Evaluate which side better defended their case. Consider:
   - How effectively each side responded to opponent's arguments
   - Ability to counter attacks and maintain position
   - Logical consistency and ability to defend against challenges

4. ADDITIONAL CRITERIA: Reasoning quality, evidence strength, factual accuracy, logical consistency, and overall argumentation quality`;

    const evaluationPrompt = `You are an expert judge evaluating a structured debate.

Debate Topic:
${topic}

Complete Debate Transcript:
${transcript}

Evaluation Criteria:
${customPrompt ? `${baseEvaluationCriteria}\n\nAdditional instructions from user:\n${customPrompt}` : baseEvaluationCriteria}

Your task:
1. Carefully review the ENTIRE debate (opening statements, all rebuttal rounds, and conclusions)
2. Analyze the main points presented by each side throughout the debate
3. Evaluate which side better PRESENTED their case (clarity, organization, persuasiveness)
4. Evaluate which side better DEFENDED their case (responses to attacks, maintaining position, logical consistency)
5. Consider all the evaluation criteria provided above
6. Provide scores (0-100) for each side based on overall performance
7. Declare a winner (or tie if appropriate)
8. Provide detailed reasoning for your decision

Format your response as follows:

MAIN POINTS ANALYSIS:
[Analyze the key arguments from each side throughout the entire debate]

PRESENTATION QUALITY:
[Evaluate which side presented their case better and why]

DEFENSE QUALITY:
[Evaluate which side defended their case better and why]

SCORES:
FOR: [score 0-100]
AGAINST: [score 0-100]

WINNER: [FOR/AGAINST/TIE]

REASONING:
[Your detailed reasoning for the scores and winner, incorporating all evaluation criteria]`;

    const messages = [new HumanMessage(evaluationPrompt)];

    try {
      const response = await this.chatModel.invoke(messages);
      const evaluationText = typeof response.content === 'string' ? response.content : String(response.content);

      // Parse the evaluation
      const scores = this.parseScores(evaluationText);
      const winner = this.parseWinner(evaluationText);

      const duration = Date.now() - startTime;
      this.logger.log(`Evaluation completed in ${duration}ms. Winner: ${winner || 'undetermined'}`);

      return {
        judgeModel: this.modelName,
        evaluation: evaluationText,
        winner,
        scores,
        reasoning: this.extractReasoning(evaluationText),
      };
    } catch (error: any) {
      this.logger.error(`Error evaluating debate: ${error.message}`);
      throw new Error(`Failed to evaluate debate: ${error.message}`);
    }
  }

  /**
   * Parse scores from judge evaluation text.
   */
  private parseScores(text: string): { yes: number; no: number } | undefined {
    const forPatterns = [
      /FOR:\s*(\d+(?:\.\d+)?)/i,
      /FOR\s+SCORE[:\s]+(\d+(?:\.\d+)?)/i,
      /FOR\s+[:\s]+(\d+(?:\.\d+)?)/i,
      /FOR\s*[:-]\s*(\d+(?:\.\d+)?)/i,
    ];

    const againstPatterns = [
      /AGAINST:\s*(\d+(?:\.\d+)?)/i,
      /AGAINST\s+SCORE[:\s]+(\d+(?:\.\d+)?)/i,
      /AGAINST\s+[:\s]+(\d+(?:\.\d+)?)/i,
      /AGAINST\s*[:-]\s*(\d+(?:\.\d+)?)/i,
    ];

    let forScore: number | null = null;
    let againstScore: number | null = null;

    for (const pattern of forPatterns) {
      const match = text.match(pattern);
      if (match) {
        forScore = parseFloat(match[1]);
        break;
      }
    }

    for (const pattern of againstPatterns) {
      const match = text.match(pattern);
      if (match) {
        againstScore = parseFloat(match[1]);
        break;
      }
    }

    if (forScore !== null && againstScore !== null) {
      const maxScore = Math.max(forScore, againstScore);

      if (maxScore > 100) {
        const normalizedFor = (forScore / maxScore) * 100;
        const normalizedAgainst = (againstScore / maxScore) * 100;
        return {
          yes: Math.round(normalizedFor * 100) / 100,
          no: Math.round(normalizedAgainst * 100) / 100,
        };
      } else if (maxScore <= 10) {
        return {
          yes: Math.round((forScore / 10) * 100 * 100) / 100,
          no: Math.round((againstScore / 10) * 100 * 100) / 100,
        };
      } else {
        return {
          yes: Math.round(forScore * 100) / 100,
          no: Math.round(againstScore * 100) / 100,
        };
      }
    }

    return undefined;
  }

  /**
   * Parse winner from judge evaluation text.
   */
  private parseWinner(text: string): 'yes' | 'no' | 'tie' | undefined {
    const upperText = text.toUpperCase();
    if (upperText.includes('WINNER: FOR') || upperText.includes('WINNER:FOR')) {
      return 'yes';
    }
    if (
      upperText.includes('WINNER: AGAINST') ||
      upperText.includes('WINNER:AGAINST')
    ) {
      return 'no';
    }
    if (upperText.includes('WINNER: TIE') || upperText.includes('WINNER:TIE')) {
      return 'tie';
    }

    if (upperText.includes('FOR WINS') || upperText.includes('FOR WON')) {
      return 'yes';
    }
    if (
      upperText.includes('AGAINST WINS') ||
      upperText.includes('AGAINST WON')
    ) {
      return 'no';
    }
    if (upperText.includes('TIE') || upperText.includes('DRAW')) {
      return 'tie';
    }

    return undefined;
  }

  /**
   * Extract reasoning section from evaluation text.
   */
  private extractReasoning(text: string): string {
    const reasoningMatch = text.match(/REASONING:\s*(.+)/is);
    if (reasoningMatch) {
      return reasoningMatch[1].trim();
    }
    return text;
  }
}


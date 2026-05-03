/**
 * Judge Agent - Evaluates debate performance and determines a winner.
 */

import { Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import {
  createOpenRouterChatModel,
  OpenRouterChatModelConfig,
} from './openrouter-chat-model';
import {
  OpeningStatements,
  DebateRound,
  Conclusions,
} from '../interfaces/debate.interface';
import { JudgeEvaluation } from '../interfaces/debate.interface';
import {
  parseScores,
  parseWinner,
  extractReasoning,
} from '../../common/utils/judge-parser.util';

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
    this.logger.log(
      `Starting evaluation for debate with ${rebuttalRounds.length} rebuttal rounds`,
    );

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
      const evaluationText =
        typeof response.content === 'string'
          ? response.content
          : String(response.content);

      // Parse the evaluation using shared utilities
      const scores = parseScores(evaluationText);
      const winner = parseWinner(evaluationText);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Evaluation completed in ${duration}ms. Winner: ${winner || 'undetermined'}`,
      );

      return {
        judgeModel: this.modelName,
        evaluation: evaluationText,
        winner,
        scores,
        reasoning: extractReasoning(evaluationText),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error evaluating debate: ${errorMessage}`);
      throw new Error(`Failed to evaluate debate: ${errorMessage}`);
    }
  }

  // Note: Parsing methods moved to common/utils/judge-parser.util.ts
  // to avoid code duplication. These methods are now imported and used
  // via parseScores, parseWinner, and extractReasoning utilities.
}

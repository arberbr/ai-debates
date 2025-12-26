/**
 * Debate orchestration service.
 * Orchestrates AI agents to debate a topic through multiple rounds and judges the outcome.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OpenRouterService } from '../common/openrouter.service';
import {
  DebateMessage,
  DebateRound,
  JudgeEvaluation,
  OpeningStatements,
  Conclusions,
  UsageData,
} from './interfaces/debate.interface';
import { cleanString } from 'src/common/utils';
import { UsageData as OpenRouterUsageData } from '../common/openrouter.service';
import { DEBATE_CONFIG } from '../common/config';

@Injectable()
export class DebateService {
  private readonly logger = new Logger(DebateService.name);

  constructor(private readonly openRouterService: OpenRouterService) {}

  /**
   * Accumulate usage data from multiple API calls.
   */
  private accumulateUsage(
    current: UsageData | undefined,
    newUsage: OpenRouterUsageData | undefined,
  ): UsageData {
    if (!newUsage) {
      return current || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        cost: 0,
      };
    }

    const existing = current || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost: 0,
      cost_details: {
        upstream_inference_cost: 0,
        upstream_inference_input_cost: 0,
        upstream_inference_output_cost: 0,
      },
      completion_tokens_details: {
        reasoning_tokens: 0,
      },
      prompt_tokens_details: {
        cached_tokens: 0,
        audio_tokens: 0,
      },
    };

    return {
      prompt_tokens: (existing.prompt_tokens || 0) + (newUsage.prompt_tokens || 0),
      completion_tokens: (existing.completion_tokens || 0) + (newUsage.completion_tokens || 0),
      total_tokens: (existing.total_tokens || 0) + (newUsage.total_tokens || 0),
      cost: (existing.cost || 0) + (newUsage.cost || 0),
      cost_details: {
        upstream_inference_cost:
          (existing.cost_details?.upstream_inference_cost || 0) +
          (newUsage.cost_details?.upstream_inference_cost || 0),
        upstream_inference_input_cost:
          (existing.cost_details?.upstream_inference_input_cost || 0) +
          (newUsage.cost_details?.upstream_inference_input_cost || 0),
        upstream_inference_output_cost:
          (existing.cost_details?.upstream_inference_output_cost || 0) +
          (newUsage.cost_details?.upstream_inference_output_cost || 0),
      },
      completion_tokens_details: {
        reasoning_tokens:
          (existing.completion_tokens_details?.reasoning_tokens || 0) +
          (newUsage.completion_tokens_details?.reasoning_tokens || 0),
      },
      prompt_tokens_details: {
        cached_tokens:
          (existing.prompt_tokens_details?.cached_tokens || 0) +
          (newUsage.prompt_tokens_details?.cached_tokens || 0),
        audio_tokens:
          (existing.prompt_tokens_details?.audio_tokens || 0) +
          (newUsage.prompt_tokens_details?.audio_tokens || 0),
      },
    };
  }

  /**
   * Generate a title for the debate topic..
   */
  async generateTitle(
    topic: string,
    apiKey: string | null,
    onStatusUpdate?: (status: string) => void,
    usageAccumulator?: { usage: UsageData },
  ): Promise<string> {
    this.logger.log('Generating title...');
    
    // Use a small, fast model for title generation
    const smallModel = DEBATE_CONFIG.titleModel;

    const titlePrompt = `
      Rewrite the following topic as a concise, descriptive title (maximum 10-12 words). Keep the core meaning but make it clear and engaging.
      Original topic:
      ${topic}
          
      Your task:
      1. The title needs to be without quotes or extra formatting.
      2. Understand the core subject matter and main proposition.
      3. Rewrite it as a short, clear title that captures the essence (aim for 7-12 words maximum).
      4. The title should be a question or statement that clearly indicates what is being debated.

      Provide ONLY the rewritten title, nothing else. No explanations, no additional text.
    `;

    if (onStatusUpdate) {
      onStatusUpdate(`Generating title with ${smallModel}...`);
    }

    const response = await this.openRouterService.queryModel(
      smallModel,
      [{ role: 'user', content: titlePrompt }],
      DEBATE_CONFIG.timeouts.titleGeneration,
      apiKey,
    );

    // Accumulate usage if accumulator provided
    if (usageAccumulator && response?.usage) {
      usageAccumulator.usage = this.accumulateUsage(usageAccumulator.usage, response.usage);
    }

    if (!response || !response.content) {
      this.logger.warn('Title generation failed, using fallback');
      // Generate a fallback title from the first part of the topic
      const fallback = topic.split('\n')[0].substring(0, 80).trim();
      return fallback.endsWith('...') ? fallback : fallback + '...';
    }

    const title = cleanString(response.content);
    
    this.logger.log(`Title generated: ${title}`);

    if (onStatusUpdate) {
      onStatusUpdate('Title generation complete');
    }

    return title;
  }

  /**
   * Generate opening statements for both debate participants.
   * Each statement should be 5-10 minutes when read (approximately 1000-2000 words, assuming 200 words per minute).
   */
  async generateOpeningStatements(
    topic: string,
    yesModel: string,
    noModel: string,
    apiKey: string | null,
    onStatusUpdate?: (status: string) => void,
    usageAccumulator?: { usage: UsageData },
  ): Promise<OpeningStatements> {
    this.logger.log('Generating opening statements...');

    const yesOpeningPrompt = `You are participating in a structured debate. You are arguing FOR the proposition.

Debate Topic:
${topic}

Your task is to prepare and deliver your opening statement. This is your opportunity to present your case clearly and persuasively.

Requirements:
1. Your opening statement should be approximately 5-10 minutes long when read aloud (target 1000-2000 words, assuming 200 words per minute reading speed)
2. Clearly state your position and main arguments
3. Present supporting evidence and reasoning
4. Anticipate potential counterarguments
5. Make your case compelling and well-structured

Provide your complete opening statement now. Be thorough, persuasive, and make sure your argument is well-supported.`;

    const noOpeningPrompt = `You are participating in a structured debate. You are arguing AGAINST the proposition.

Debate Topic:
${topic}

Your task is to prepare and deliver your opening statement. This is your opportunity to present your case clearly and persuasively.

Requirements:
1. Your opening statement should be approximately 5-10 minutes long when read aloud (target 1000-2000 words, assuming 200 words per minute reading speed)
2. Clearly state your position and main arguments
3. Present supporting evidence and reasoning
4. Anticipate potential counterarguments
5. Make your case compelling and well-structured

Provide your complete opening statement now. Be thorough, persuasive, and make sure your argument is well-supported.`;

    // Generate opening statements in parallel
    if (onStatusUpdate) {
      onStatusUpdate(`Querying ${yesModel} for opening statement (FOR side)...`);
      onStatusUpdate(`Querying ${noModel} for opening statement (AGAINST side)...`);
    }

    const [yesResponse, noResponse] = await Promise.all([
      this.openRouterService.queryModel(
        yesModel,
        [{ role: 'user', content: yesOpeningPrompt }],
        DEBATE_CONFIG.timeouts.openingStatements,
        apiKey,
      ).then((response) => {
        if (usageAccumulator && response?.usage) {
          usageAccumulator.usage = this.accumulateUsage(usageAccumulator.usage, response.usage);
        }
        if (onStatusUpdate) {
          onStatusUpdate(`${yesModel} opening statement complete`);
        }
        return response;
      }),
      this.openRouterService.queryModel(
        noModel,
        [{ role: 'user', content: noOpeningPrompt }],
        DEBATE_CONFIG.timeouts.openingStatements,
        apiKey,
      ).then((response) => {
        if (usageAccumulator && response?.usage) {
          usageAccumulator.usage = this.accumulateUsage(usageAccumulator.usage, response.usage);
        }
        if (onStatusUpdate) {
          onStatusUpdate(`${noModel} opening statement complete`);
        }
        return response;
      }),
    ]);

    if (!yesResponse || !yesResponse.content) {
      throw new Error(`Failed to generate opening statement from ${yesModel}`);
    }

    if (!noResponse || !noResponse.content) {
      throw new Error(`Failed to generate opening statement from ${noModel}`);
    }

    const yesStatement: DebateMessage = {
      role: 'yes',
      model: yesModel,
      content: yesResponse.content,
      round: 0, // Use 0 to indicate opening statement
      timestamp: new Date().toISOString(),
    };

    const noStatement: DebateMessage = {
      role: 'no',
      model: noModel,
      content: noResponse.content,
      round: 0, // Use 0 to indicate opening statement
      timestamp: new Date().toISOString(),
    };

    return {
      yesStatement,
      noStatement,
    };
  }

  /**
   * Conduct a single rebuttal round between the two participants.
   * Round 1: Each side analyzes and rebuts the opponent's opening statement.
   * Subsequent rounds: Each side focuses on the opponent's arguments from the previous rebuttal round.
   */
  async conductRebuttalRound(
    topic: string,
    yesModel: string,
    noModel: string,
    round: number,
    openingStatements: OpeningStatements,
    previousRounds: DebateRound[],
    apiKey: string | null,
    onStatusUpdate?: (status: string) => void,
    usageAccumulator?: { usage: UsageData },
  ): Promise<DebateRound> {
    this.logger.log(`Conducting rebuttal round ${round}...`);

    // Build context for YES side
    const yesContext: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content: `You are participating in a structured debate on the following topic:

${topic}

You are arguing FOR the proposition.

Your opening statement:
${openingStatements.yesStatement.content}`,
      },
    ];

    // Build context for NO side
    const noContext: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content: `You are participating in a structured debate on the following topic:

${topic}

You are arguing AGAINST the proposition.

Your opening statement:
${openingStatements.noStatement.content}`,
      },
    ];

    // For round 1, provide opponent's opening statement
    // For subsequent rounds, provide previous round's arguments
    if (round === 1) {
      // First rebuttal: analyze and attack opponent's opening statement
      yesContext.push({
        role: 'user',
        content: `Your opponent's opening statement (AGAINST side):
${openingStatements.noStatement.content}`,
      });

      noContext.push({
        role: 'user',
        content: `Your opponent's opening statement (FOR side):
${openingStatements.yesStatement.content}`,
      });
    } else {
      // Subsequent rounds: focus on previous round's arguments
      const previousRound = previousRounds[previousRounds.length - 1];
      yesContext.push({
        role: 'user',
        content: `Your opponent's argument from Rebuttal Round ${previousRound.round} (AGAINST side):
${previousRound.noMessage.content}`,
      });

      noContext.push({
        role: 'user',
        content: `Your opponent's argument from Rebuttal Round ${previousRound.round} (FOR side):
${previousRound.yesMessage.content}`,
      });

      // Add all previous rebuttal rounds for context
      for (const prevRound of previousRounds) {
        yesContext.push({
          role: 'assistant',
          content: `Your rebuttal from Round ${prevRound.round}:\n${prevRound.yesMessage.content}`,
        });
        noContext.push({
          role: 'assistant',
          content: `Your rebuttal from Round ${prevRound.round}:\n${prevRound.noMessage.content}`,
        });
      }
    }

    // Create prompts for this rebuttal round
    const yesPrompt = round === 1
      ? `This is Rebuttal Round ${round}. Analyze your opponent's opening statement carefully. Dissect their arguments, identify weaknesses, logical fallacies, or unsupported claims. Present strong counterarguments and defend your position. Be thorough and persuasive.`
      : `This is Rebuttal Round ${round}. Focus on your opponent's arguments from the previous round. Address their specific points, counter their rebuttals, and strengthen your position. Be direct, logical, and persuasive.`;

    const noPrompt = round === 1
      ? `This is Rebuttal Round ${round}. Analyze your opponent's opening statement carefully. Dissect their arguments, identify weaknesses, logical fallacies, or unsupported claims. Present strong counterarguments and defend your position. Be thorough and persuasive.`
      : `This is Rebuttal Round ${round}. Focus on your opponent's arguments from the previous round. Address their specific points, counter their rebuttals, and strengthen your position. Be direct, logical, and persuasive.`;

    // Get responses in parallel
    if (onStatusUpdate) {
      onStatusUpdate(`Waiting for ${yesModel} rebuttal (FOR side, round ${round})...`);
      onStatusUpdate(`Waiting for ${noModel} rebuttal (AGAINST side, round ${round})...`);
    }

    const [yesResponse, noResponse] = await Promise.all([
      this.openRouterService.queryModel(
        yesModel,
        [...yesContext, { role: 'user', content: yesPrompt }],
        DEBATE_CONFIG.timeouts.rebuttals,
        apiKey,
      )
        .then((response) => {
          if (usageAccumulator && response?.usage) {
            usageAccumulator.usage = this.accumulateUsage(usageAccumulator.usage, response.usage);
          }
          if (onStatusUpdate) {
            onStatusUpdate(`${yesModel} rebuttal received for round ${round}`);
          }
          return response;
        })
        .catch((error) => {
          this.logger.error(`Error querying ${yesModel}:`, error.message);
          if (onStatusUpdate) {
            onStatusUpdate(`Error from ${yesModel}: ${error.message}`);
          }
          throw new Error(`Failed to get response from ${yesModel}: ${error.message}`);
        }),
      this.openRouterService.queryModel(
        noModel,
        [...noContext, { role: 'user', content: noPrompt }],
        DEBATE_CONFIG.timeouts.rebuttals,
        apiKey,
      )
        .then((response) => {
          if (usageAccumulator && response?.usage) {
            usageAccumulator.usage = this.accumulateUsage(usageAccumulator.usage, response.usage);
          }
          if (onStatusUpdate) {
            onStatusUpdate(`${noModel} rebuttal received for round ${round}`);
          }
          return response;
        })
        .catch((error) => {
          this.logger.error(`Error querying ${noModel}:`, error.message);
          if (onStatusUpdate) {
            onStatusUpdate(`Error from ${noModel}: ${error.message}`);
          }
          throw new Error(`Failed to get response from ${noModel}: ${error.message}`);
        }),
    ]);

    if (!yesResponse || !yesResponse.content) {
      throw new Error(`Failed to generate rebuttal from ${yesModel}. The model may have insufficient credits or encountered an error.`);
    }

    if (!noResponse || !noResponse.content) {
      throw new Error(`Failed to generate rebuttal from ${noModel}. The model may have insufficient credits or encountered an error.`);
    }

    const yesMessage: DebateMessage = {
      role: 'yes',
      model: yesModel,
      content: yesResponse.content,
      round,
      timestamp: new Date().toISOString(),
    };

    const noMessage: DebateMessage = {
      role: 'no',
      model: noModel,
      content: noResponse.content,
      round,
      timestamp: new Date().toISOString(),
    };

    return {
      round,
      yesMessage,
      noMessage,
    };
  }

  /**
   * Generate conclusions for both debate participants.
   * Each conclusion should be 2-5 minutes when read (approximately 400-1000 words, assuming 200 words per minute).
   */
  async generateConclusions(
    topic: string,
    yesModel: string,
    noModel: string,
    openingStatements: OpeningStatements,
    rebuttalRounds: DebateRound[],
    apiKey: string | null,
    onStatusUpdate?: (status: string) => void,
    usageAccumulator?: { usage: UsageData },
  ): Promise<Conclusions> {
    this.logger.log('Generating conclusions...');

    // Build full debate context for both sides
    let yesDebateHistory = `Your opening statement:\n${openingStatements.yesStatement.content}\n\n`;
    let noDebateHistory = `Your opening statement:\n${openingStatements.noStatement.content}\n\n`;

    for (const round of rebuttalRounds) {
      yesDebateHistory += `Rebuttal Round ${round.round} - Your opponent's argument:\n${round.noMessage.content}\n\n`;
      yesDebateHistory += `Rebuttal Round ${round.round} - Your rebuttal:\n${round.yesMessage.content}\n\n`;
      
      noDebateHistory += `Rebuttal Round ${round.round} - Your opponent's argument:\n${round.yesMessage.content}\n\n`;
      noDebateHistory += `Rebuttal Round ${round.round} - Your rebuttal:\n${round.noMessage.content}\n\n`;
    }

    const yesConclusionPrompt = `You are concluding a structured debate. You argued FOR the proposition.

Debate Topic:
${topic}

Complete Debate History:
${yesDebateHistory}

Your task is to deliver your concluding statement. This is your final opportunity to:
1. Summarize your main arguments and why they still hold
2. Address how you responded to your opponent's challenges
3. Reinforce why your position is correct
4. You may acknowledge any weaknesses if appropriate, or concede if you believe your position has been successfully challenged

Requirements:
- Your conclusion should be approximately 2-5 minutes long when read aloud (target 400-1000 words, assuming 200 words per minute reading speed)
- Be honest and reflective - if your position was successfully challenged, you may acknowledge this
- Be clear and persuasive in restating why your position holds (or why you've changed your position if that's the case)

Provide your complete concluding statement now.`;

    const noConclusionPrompt = `You are concluding a structured debate. You argued AGAINST the proposition.

Debate Topic:
${topic}

Complete Debate History:
${noDebateHistory}

Your task is to deliver your concluding statement. This is your final opportunity to:
1. Summarize your main arguments and why they still hold
2. Address how you responded to your opponent's challenges
3. Reinforce why your position is correct
4. You may acknowledge any weaknesses if appropriate, or concede if you believe your position has been successfully challenged

Requirements:
- Your conclusion should be approximately 2-5 minutes long when read aloud (target 400-1000 words, assuming 200 words per minute reading speed)
- Be honest and reflective - if your position was successfully challenged, you may acknowledge this
- Be clear and persuasive in restating why your position holds (or why you've changed your position if that's the case)

Provide your complete concluding statement now.`;

    // Generate conclusions in parallel
    if (onStatusUpdate) {
      onStatusUpdate(`Querying ${yesModel} for conclusion (FOR side)...`);
      onStatusUpdate(`Querying ${noModel} for conclusion (AGAINST side)...`);
    }

    const [yesResponse, noResponse] = await Promise.all([
      this.openRouterService.queryModel(
        yesModel,
        [{ role: 'user', content: yesConclusionPrompt }],
        DEBATE_CONFIG.timeouts.conclusions,
        apiKey,
      ).then((response) => {
        if (usageAccumulator && response?.usage) {
          usageAccumulator.usage = this.accumulateUsage(usageAccumulator.usage, response.usage);
        }
        if (onStatusUpdate) {
          onStatusUpdate(`${yesModel} conclusion complete`);
        }
        return response;
      }),
      this.openRouterService.queryModel(
        noModel,
        [{ role: 'user', content: noConclusionPrompt }],
        DEBATE_CONFIG.timeouts.conclusions,
        apiKey,
      ).then((response) => {
        if (usageAccumulator && response?.usage) {
          usageAccumulator.usage = this.accumulateUsage(usageAccumulator.usage, response.usage);
        }
        if (onStatusUpdate) {
          onStatusUpdate(`${noModel} conclusion complete`);
        }
        return response;
      }),
    ]);

    if (!yesResponse || !yesResponse.content) {
      throw new Error(`Failed to generate conclusion from ${yesModel}`);
    }

    if (!noResponse || !noResponse.content) {
      throw new Error(`Failed to generate conclusion from ${noModel}`);
    }

    const yesConclusion: DebateMessage = {
      role: 'yes',
      model: yesModel,
      content: yesResponse.content,
      round: -1, // Use -1 to indicate conclusion
      timestamp: new Date().toISOString(),
    };

    const noConclusion: DebateMessage = {
      role: 'no',
      model: noModel,
      content: noResponse.content,
      round: -1, // Use -1 to indicate conclusion
      timestamp: new Date().toISOString(),
    };

    return {
      yesConclusion,
      noConclusion,
    };
  }

  /**
   * Have a judge evaluate the debate.
   */
  async evaluateDebate(
    topic: string,
    openingStatements: OpeningStatements,
    rebuttalRounds: DebateRound[],
    conclusions: Conclusions,
    judgeModel: string,
    judgePrompt: string,
    apiKey: string | null,
    onStatusUpdate?: (status: string) => void,
    usageAccumulator?: { usage: UsageData },
  ): Promise<JudgeEvaluation> {
    const startTime = Date.now();
    this.logger.log(`[Judge ${judgeModel}] Starting evaluation for debate with ${rebuttalRounds.length} rebuttal rounds`);

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
${judgePrompt ? `${baseEvaluationCriteria}\n\nAdditional instructions from user:\n${judgePrompt}` : baseEvaluationCriteria}

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

    if (onStatusUpdate) {
      onStatusUpdate(`Sending debate transcript to ${judgeModel} for evaluation...`);
    }

    const response = await this.openRouterService.queryModel(
      judgeModel,
      [{ role: 'user', content: evaluationPrompt }],
      DEBATE_CONFIG.timeouts.judgeEvaluation,
      apiKey,
    ).then((response) => {
      if (usageAccumulator && response?.usage) {
        usageAccumulator.usage = this.accumulateUsage(usageAccumulator.usage, response.usage);
      }
      if (onStatusUpdate) {
        onStatusUpdate(`${judgeModel} evaluation response received, parsing...`);
      }
      return response;
    });

    const evaluationText = response?.content || 'Evaluation failed';

    // Parse the evaluation
    const scores = this.parseScores(evaluationText);
    const winner = this.parseWinner(evaluationText);
    
    const duration = Date.now() - startTime;
    this.logger.log(`[Judge ${judgeModel}] Evaluation completed in ${duration}ms. Winner: ${winner || 'undetermined'}`);

    return {
      judgeModel,
      evaluation: evaluationText,
      winner,
      scores,
      reasoning: this.extractReasoning(evaluationText),
    };
  }

  /**
   * Parse scores from judge evaluation text.
   * Handles various formats and normalizes scores to 0-100 scale.
   */
  private parseScores(text: string): { yes: number; no: number } | undefined {
    // Try multiple patterns for FOR score
    const forPatterns = [
      /FOR:\s*(\d+(?:\.\d+)?)/i,
      /FOR\s+SCORE[:\s]+(\d+(?:\.\d+)?)/i,
      /FOR\s+[:\s]+(\d+(?:\.\d+)?)/i,
      /FOR\s*[:-]\s*(\d+(?:\.\d+)?)/i,
    ];

    // Try multiple patterns for AGAINST score
    const againstPatterns = [
      /AGAINST:\s*(\d+(?:\.\d+)?)/i,
      /AGAINST\s+SCORE[:\s]+(\d+(?:\.\d+)?)/i,
      /AGAINST\s+[:\s]+(\d+(?:\.\d+)?)/i,
      /AGAINST\s*[:-]\s*(\d+(?:\.\d+)?)/i,
    ];

    let forScore: number | null = null;
    let againstScore: number | null = null;

    // Try to find FOR score
    for (const pattern of forPatterns) {
      const match = text.match(pattern);
      if (match) {
        forScore = parseFloat(match[1]);
        break;
      }
    }

    // Try to find AGAINST score
    for (const pattern of againstPatterns) {
      const match = text.match(pattern);
      if (match) {
        againstScore = parseFloat(match[1]);
        break;
      }
    }

    // If we found both scores, normalize them to 0-100 scale
    if (forScore !== null && againstScore !== null) {
      // Check if scores are already in 0-100 range
      const maxScore = Math.max(forScore, againstScore);
      
      // If max score is > 100, assume they're on a different scale and normalize
      // If max score is <= 100, assume they're already on 0-100 scale
      if (maxScore > 100) {
        // Normalize to 0-100 scale (assuming original scale is 0 to maxScore)
        const normalizedFor = (forScore / maxScore) * 100;
        const normalizedAgainst = (againstScore / maxScore) * 100;
        return {
          yes: Math.round(normalizedFor * 100) / 100,
          no: Math.round(normalizedAgainst * 100) / 100,
        };
      } else if (maxScore <= 10) {
        // If scores are 0-10, scale to 0-100
        return {
          yes: Math.round((forScore / 10) * 100 * 100) / 100,
          no: Math.round((againstScore / 10) * 100 * 100) / 100,
        };
      } else {
        // Already in 0-100 range, return as-is
        return {
          yes: Math.round(forScore * 100) / 100,
          no: Math.round(againstScore * 100) / 100,
        };
      }
    }

    // Fallback: try to find any two numbers near "FOR" and "AGAINST" keywords
    const forSection = text.match(/FOR[^\n]*?(\d+(?:\.\d+)?)/i);
    const againstSection = text.match(/AGAINST[^\n]*?(\d+(?:\.\d+)?)/i);

    if (forSection && againstSection) {
      const forVal = parseFloat(forSection[1]);
      const againstVal = parseFloat(againstSection[1]);
      const maxVal = Math.max(forVal, againstVal);

      if (maxVal > 100) {
        return {
          yes: Math.round((forVal / maxVal) * 100 * 100) / 100,
          no: Math.round((againstVal / maxVal) * 100 * 100) / 100,
        };
      } else if (maxVal <= 10) {
        return {
          yes: Math.round((forVal / 10) * 100 * 100) / 100,
          no: Math.round((againstVal / 10) * 100 * 100) / 100,
        };
      } else {
        return {
          yes: Math.round(forVal * 100) / 100,
          no: Math.round(againstVal * 100) / 100,
        };
      }
    }

    // Last resort: find any two numbers in the SCORES section
    const scoresSection = text.match(/SCORES?:?\s*([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i);
    if (scoresSection) {
      const numbers = scoresSection[1].match(/\b(\d+(?:\.\d+)?)\b/g);
      if (numbers && numbers.length >= 2) {
        const forVal = parseFloat(numbers[0]);
        const againstVal = parseFloat(numbers[1]);
        const maxVal = Math.max(forVal, againstVal);

        if (maxVal > 100) {
          return {
            yes: Math.round((forVal / maxVal) * 100 * 100) / 100,
            no: Math.round((againstVal / maxVal) * 100 * 100) / 100,
          };
        } else if (maxVal <= 10) {
          return {
            yes: Math.round((forVal / 10) * 100 * 100) / 100,
            no: Math.round((againstVal / 10) * 100 * 100) / 100,
          };
        } else {
          return {
            yes: Math.round(forVal * 100) / 100,
            no: Math.round(againstVal * 100) / 100,
          };
        }
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

    // Fallback: check for keywords
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
    return text; // Return full text if no reasoning section found
  }

  /**
   * Calculate aggregate scores and determine final winner.
   */
  calculateFinalResult(
    judgeEvaluations: JudgeEvaluation[],
  ): { winner: 'yes' | 'no' | 'tie'; aggregateScore: { yes: number; no: number } } {
    let totalYes = 0;
    let totalNo = 0;
    let count = 0;

    for (const evaluation of judgeEvaluations) {
      if (evaluation.scores) {
        totalYes += evaluation.scores.yes;
        totalNo += evaluation.scores.no;
        count++;
      }
    }

    const avgYes = count > 0 ? totalYes / count : 0;
    const avgNo = count > 0 ? totalNo / count : 0;

    let winner: 'yes' | 'no' | 'tie';
    if (avgYes > avgNo + DEBATE_CONFIG.tieThreshold) {
      winner = 'yes';
    } else if (avgNo > avgYes + 5) {
      winner = 'no';
    } else {
      winner = 'tie';
    }

    return {
      winner,
      aggregateScore: {
        yes: Math.round(avgYes * 100) / 100,
        no: Math.round(avgNo * 100) / 100,
      },
    };
  }
}

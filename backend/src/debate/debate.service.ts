/**
 * Debate orchestration service.
 * Orchestrates AI agents to debate a topic through multiple rounds and judges the outcome.
 * Uses LangChain agents for debaters, judges, and title generation.
 */

import { Injectable, Logger } from '@nestjs/common';
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
import { DebaterAgent } from './agents/debater-agent';
import { JudgeAgent } from './agents/judge-agent';
import { TitleGeneratorAgent } from './agents/title-generator-agent';

@Injectable()
export class DebateService {
  private readonly logger = new Logger(DebateService.name);

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
   * Generate a title for the debate topic using TitleGeneratorAgent.
   */
  async generateTitle(
    topic: string,
    apiKey: string | null,
    onStatusUpdate?: (status: string) => void,
    usageAccumulator?: { usage: UsageData },
  ): Promise<string> {
    this.logger.log('Generating title...');
    
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    // Use a small, fast model for title generation
    const smallModel = DEBATE_CONFIG.titleModel;

    if (onStatusUpdate) {
      onStatusUpdate(`Generating title with ${smallModel}...`);
    }

    try {
      const titleAgent = new TitleGeneratorAgent({
        model: smallModel,
        apiKey,
        timeout: DEBATE_CONFIG.timeouts.titleGeneration,
      });

      const title = await titleAgent.generateTitle(topic);
      const cleanedTitle = cleanString(title);

      this.logger.log(`Title generated: ${cleanedTitle}`);

      if (onStatusUpdate) {
        onStatusUpdate('Title generation complete');
      }

      return cleanedTitle;
    } catch (error: any) {
      this.logger.warn('Title generation failed, using fallback', error);
      // Generate a fallback title from the first part of the topic
      const fallback = topic.split('\n')[0].substring(0, 80).trim();
      return fallback.endsWith('...') ? fallback : fallback + '...';
    }
  }

  /**
   * Generate opening statements for both debate participants using DebaterAgents.
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

    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    // Generate opening statements in parallel using agents
    if (onStatusUpdate) {
      onStatusUpdate(`Querying ${yesModel} for opening statement (FOR side)...`);
      onStatusUpdate(`Querying ${noModel} for opening statement (AGAINST side)...`);
    }

    const yesAgent = new DebaterAgent({
      model: yesModel,
      apiKey,
      position: 'yes',
      topic,
      timeout: DEBATE_CONFIG.timeouts.openingStatements,
    });

    const noAgent = new DebaterAgent({
      model: noModel,
      apiKey,
      position: 'no',
      topic,
      timeout: DEBATE_CONFIG.timeouts.openingStatements,
    });

    const [yesResponse, noResponse] = await Promise.all([
      yesAgent.generateOpeningStatement(topic, 'yes').then((response) => {
        if (usageAccumulator && response.usage) {
          usageAccumulator.usage = this.accumulateUsage(usageAccumulator.usage, response.usage);
        }
        if (onStatusUpdate) {
          onStatusUpdate(`${yesModel} opening statement complete`);
        }
        return response;
      }),
      noAgent.generateOpeningStatement(topic, 'no').then((response) => {
        if (usageAccumulator && response.usage) {
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
   * Conduct a single rebuttal round between the two participants using DebaterAgents.
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

    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    // Get responses in parallel using agents
    if (onStatusUpdate) {
      onStatusUpdate(`Waiting for ${yesModel} rebuttal (FOR side, round ${round})...`);
      onStatusUpdate(`Waiting for ${noModel} rebuttal (AGAINST side, round ${round})...`);
    }

    const yesAgent = new DebaterAgent({
      model: yesModel,
      apiKey,
      position: 'yes',
      topic,
      timeout: DEBATE_CONFIG.timeouts.rebuttals,
    });

    const noAgent = new DebaterAgent({
      model: noModel,
      apiKey,
      position: 'no',
      topic,
      timeout: DEBATE_CONFIG.timeouts.rebuttals,
    });

    // Determine opponent arguments based on round
    let yesOpponentArgs: string;
    let noOpponentArgs: string;
    let previousRoundsForHistory: Array<{ yesMessage: string; noMessage: string; round: number }> | undefined;

    if (round === 1) {
      // First rebuttal: use opponent's opening statement
      yesOpponentArgs = openingStatements.noStatement.content;
      noOpponentArgs = openingStatements.yesStatement.content;
    } else {
      // Subsequent rounds: use previous round's arguments
      const previousRound = previousRounds[previousRounds.length - 1];
      yesOpponentArgs = previousRound.noMessage.content;
      noOpponentArgs = previousRound.yesMessage.content;
      previousRoundsForHistory = previousRounds.map((r) => ({
        yesMessage: r.yesMessage.content,
        noMessage: r.noMessage.content,
        round: r.round,
      }));
    }

    const [yesResponse, noResponse] = await Promise.all([
      yesAgent
        .generateRebuttal(
          topic,
          'yes',
          openingStatements.yesStatement.content,
          yesOpponentArgs,
          round,
          previousRoundsForHistory,
        )
        .then((response) => {
          if (usageAccumulator && response.usage) {
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
      noAgent
        .generateRebuttal(
          topic,
          'no',
          openingStatements.noStatement.content,
          noOpponentArgs,
          round,
          previousRoundsForHistory,
        )
        .then((response) => {
          if (usageAccumulator && response.usage) {
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
   * Generate conclusions for both debate participants using DebaterAgents.
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

    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    // Generate conclusions in parallel using agents
    if (onStatusUpdate) {
      onStatusUpdate(`Querying ${yesModel} for conclusion (FOR side)...`);
      onStatusUpdate(`Querying ${noModel} for conclusion (AGAINST side)...`);
    }

    const yesAgent = new DebaterAgent({
      model: yesModel,
      apiKey,
      position: 'yes',
      topic,
      timeout: DEBATE_CONFIG.timeouts.conclusions,
    });

    const noAgent = new DebaterAgent({
      model: noModel,
      apiKey,
      position: 'no',
      topic,
      timeout: DEBATE_CONFIG.timeouts.conclusions,
    });

    // Build debate history for agents
    const debateHistory = rebuttalRounds.map((r) => ({
      yesMessage: r.yesMessage.content,
      noMessage: r.noMessage.content,
      round: r.round,
    }));

    const [yesResponse, noResponse] = await Promise.all([
      yesAgent
        .generateConclusion(topic, 'yes', openingStatements.yesStatement.content, debateHistory)
        .then((response) => {
          if (usageAccumulator && response.usage) {
            usageAccumulator.usage = this.accumulateUsage(usageAccumulator.usage, response.usage);
          }
          if (onStatusUpdate) {
            onStatusUpdate(`${yesModel} conclusion complete`);
          }
          return response;
        }),
      noAgent
        .generateConclusion(topic, 'no', openingStatements.noStatement.content, debateHistory)
        .then((response) => {
          if (usageAccumulator && response.usage) {
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
   * Have a judge evaluate the debate using JudgeAgent.
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
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    if (onStatusUpdate) {
      onStatusUpdate(`Sending debate transcript to ${judgeModel} for evaluation...`);
    }

    const judgeAgent = new JudgeAgent({
      model: judgeModel,
      apiKey,
      timeout: DEBATE_CONFIG.timeouts.judgeEvaluation,
    });

    const evaluation = await judgeAgent
      .evaluateDebate(topic, openingStatements, rebuttalRounds, conclusions, judgePrompt || undefined)
      .then((result) => {
        // Note: JudgeAgent doesn't currently return usage data directly
        // Usage tracking would need to be added if required
        if (onStatusUpdate) {
          onStatusUpdate(`${judgeModel} evaluation response received, parsing...`);
        }
        return result;
      });

    return evaluation;
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

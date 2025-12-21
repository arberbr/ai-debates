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
  DebateResult,
} from './interfaces/debate.interface';

@Injectable()
export class DebateService {
  private readonly logger = new Logger(DebateService.name);

  constructor(private readonly openRouterService: OpenRouterService) {}

  /**
   * Generate a concise title for the debate topic/article.
   */
  async generateTitle(
    topic: string,
    apiKey: string | null,
    onStatusUpdate?: (status: string) => void,
  ): Promise<string> {
    this.logger.log('Generating concise title...');

    // Use a small, fast model for title generation
    const smallModel = 'mistralai/ministral-14b-2512';

    const titlePrompt = `Analyze the following topic or article and generate a concise, descriptive title (maximum 10-12 words).

Original topic/article:
${topic}

Your task:
1. The topic needs to be without quotes or extra formatting.
2. Understand the core subject matter and main proposition.
3. Extract the key question or debate point.
4. Create a short, clear title that captures the essence (aim for 7-12 words maximum).
5. The title should be a question or statement that clearly indicates what is being debated.

Provide ONLY the title, nothing else. No explanations, no additional text.`;

    if (onStatusUpdate) {
      onStatusUpdate(`Generating title with ${smallModel}...`);
    }

    const response = await this.openRouterService.queryModel(
      smallModel,
      [{ role: 'user', content: titlePrompt }],
      30000, // Shorter timeout for small model
      apiKey,
    );

    if (!response || !response.content) {
      this.logger.warn('Title generation failed, using fallback');
      // Generate a fallback title from the first part of the topic
      const fallback = topic.split('\n')[0].substring(0, 80).trim();
      return fallback.endsWith('...') ? fallback : fallback + '...';
    }

    let title = response.content.trim();
    
    // Clean up markdown formatting and quotes - be aggressive
    // First, remove markdown bold markers (**) - handle patterns like **"text"** or **text**
    title = title.replace(/\*\*/g, '');
    // Remove any remaining single asterisks (*) - but be careful not to remove legitimate asterisks in text
    // Only remove if they're at the start/end or clearly markdown formatting
    title = title.replace(/^\*+|\*+$/g, '');
    // Remove markdown italic markers (_) at start/end
    title = title.replace(/^_+|_+$/g, '');
    // Remove leading/trailing quotes (single or double) - handle multiple quotes and combinations
    title = title.replace(/^["'`]+|["'`]+$/g, '');
    // Remove any leading/trailing whitespace, colons, dashes that might be leftover formatting
    title = title.replace(/^[\s:-]+|[\s:-]+$/g, '');
    // Final trim
    const cleanTitle = title.trim();
    
    this.logger.log(`Title generated: ${cleanTitle}`);

    if (onStatusUpdate) {
      onStatusUpdate('Title generation complete');
    }

    return cleanTitle;
  }

  /**
   * Rewrite the topic in a concise, short way using a small model.
   */
  async rewriteTopic(
    topic: string,
    apiKey: string | null,
    onStatusUpdate?: (status: string) => void,
  ): Promise<string> {
    this.logger.log('Rewriting topic to concise format...');

    // Use a small, fast model for topic rewriting
    const smallModel = 'google/gemini-flash-2.5';

    const rewritePrompt = `Analyze the following topic or article and rewrite it in a concise, short way (maximum 2-3 sentences or a brief title).

Original topic/article:
${topic}

Your task:
1. Understand the core subject matter
2. Extract the main proposition or question
3. Rewrite it in a clear, concise format (aim for 2-3 sentences maximum, or a brief title if appropriate)
4. Keep the essential meaning and context

Provide only the rewritten concise version, nothing else.`;

    if (onStatusUpdate) {
      onStatusUpdate(`Rewriting topic with ${smallModel}...`);
    }

    const response = await this.openRouterService.queryModel(
      smallModel,
      [{ role: 'user', content: rewritePrompt }],
      30000, // Shorter timeout for small model
      apiKey,
    );

    if (!response || !response.content) {
      this.logger.warn('Topic rewrite failed, using original topic');
      return topic; // Fallback to original topic
    }

    const rewrittenTopic = response.content.trim();
    this.logger.log(`Topic rewritten: ${rewrittenTopic.substring(0, 100)}...`);

    if (onStatusUpdate) {
      onStatusUpdate('Topic rewrite complete');
    }

    return rewrittenTopic;
  }

  /**
   * Analyze the topic/article with both debate participants to prepare their initial positions.
   */
  async analyzeTopic(
    topic: string,
    yesModel: string,
    noModel: string,
    apiKey: string | null,
    onStatusUpdate?: (status: string) => void,
  ): Promise<{ yesAnalysis: string; noAnalysis: string }> {
    this.logger.log('Starting topic analysis...');

    const yesAnalysisPrompt = `You are about to participate in a structured debate. Analyze the following topic or article and prepare your initial position.

Topic/Article:
${topic}

Your task:
1. Carefully read and understand the topic/article
2. Identify key points, arguments, and evidence
3. Prepare your initial position (you will be arguing FOR the proposition)
4. Think about potential counterarguments you might face
5. Prepare strong supporting evidence and reasoning

Provide a comprehensive analysis that will serve as your foundation for the debate. Be thorough and thoughtful.`;

    const noAnalysisPrompt = `You are about to participate in a structured debate. Analyze the following topic or article and prepare your initial position.

Topic/Article:
${topic}

Your task:
1. Carefully read and understand the topic/article
2. Identify key points, arguments, and evidence
3. Prepare your initial position (you will be arguing AGAINST the proposition)
4. Think about potential counterarguments you might face
5. Prepare strong supporting evidence and reasoning

Provide a comprehensive analysis that will serve as your foundation for the debate. Be thorough and thoughtful.`;

    // Analyze with both models in parallel
    if (onStatusUpdate) {
      onStatusUpdate(`Querying ${yesModel} for topic analysis (FOR side)...`);
      onStatusUpdate(`Querying ${noModel} for topic analysis (AGAINST side)...`);
    }

    const [yesResponse, noResponse] = await Promise.all([
      this.openRouterService.queryModel(
        yesModel,
        [{ role: 'user', content: yesAnalysisPrompt }],
        120000,
        apiKey,
      ).then((response) => {
        if (onStatusUpdate) {
          onStatusUpdate(`${yesModel} analysis complete`);
        }
        return response;
      }),
      this.openRouterService.queryModel(
        noModel,
        [{ role: 'user', content: noAnalysisPrompt }],
        120000,
        apiKey,
      ).then((response) => {
        if (onStatusUpdate) {
          onStatusUpdate(`${noModel} analysis complete`);
        }
        return response;
      }),
    ]);

    return {
      yesAnalysis: yesResponse?.content || 'Analysis failed',
      noAnalysis: noResponse?.content || 'Analysis failed',
    };
  }

  /**
   * Conduct a single debate round between the two participants.
   */
  async conductDebateRound(
    topic: string,
    yesModel: string,
    noModel: string,
    round: number,
    previousRounds: DebateRound[],
    yesAnalysis: string,
    noAnalysis: string,
    apiKey: string | null,
    onStatusUpdate?: (status: string) => void,
  ): Promise<DebateRound> {
    this.logger.log(`Conducting debate round ${round}...`);

    // Add initial analysis context for YES side
    const yesConversationHistory: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content: `You are participating in a structured debate on the following topic:

${topic}

Your initial analysis:
${yesAnalysis}

You are arguing FOR the proposition.`,
      },
    ];

    const noConversationHistory: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content: `You are participating in a structured debate on the following topic:

${topic}

Your initial analysis:
${noAnalysis}

You are arguing AGAINST the proposition.`,
      },
    ];

    // Add previous rounds to context for YES side
    for (const prevRound of previousRounds) {
      yesConversationHistory.push({
        role: 'user',
        content: `Round ${prevRound.round} - Opponent's argument:\n${prevRound.noMessage.content}`,
      });
      yesConversationHistory.push({
        role: 'assistant',
        content: `Round ${prevRound.round} - My argument:\n${prevRound.yesMessage.content}`,
      });
    }

    // Add previous rounds to context for NO side
    for (const prevRound of previousRounds) {
      noConversationHistory.push({
        role: 'user',
        content: `Round ${prevRound.round} - Opponent's argument:\n${prevRound.yesMessage.content}`,
      });
      noConversationHistory.push({
        role: 'assistant',
        content: `Round ${prevRound.round} - My argument:\n${prevRound.noMessage.content}`,
      });
    }

    // Create prompts for this round
    const yesPrompt = `This is Round ${round} of the debate. 

${previousRounds.length > 0 ? 'Based on the previous rounds, respond to your opponent\'s arguments and strengthen your position.' : 'Present your opening argument. Make it strong, well-reasoned, and supported by evidence.'}

Be persuasive, logical, and address any counterarguments. Keep your response focused and impactful.`;

    const noPrompt = `This is Round ${round} of the debate.

${previousRounds.length > 0 ? 'Based on the previous rounds, respond to your opponent\'s arguments and strengthen your position.' : 'Present your opening argument. Make it strong, well-reasoned, and supported by evidence.'}

Be persuasive, logical, and address any counterarguments. Keep your response focused and impactful.`;

    // Get responses in parallel
    if (onStatusUpdate) {
      onStatusUpdate(`Waiting for ${yesModel} response (FOR side, round ${round})...`);
      onStatusUpdate(`Waiting for ${noModel} response (AGAINST side, round ${round})...`);
    }

    const [yesResponse, noResponse] = await Promise.all([
      this.openRouterService.queryModel(
        yesModel,
        [...yesConversationHistory, { role: 'user', content: yesPrompt }],
        120000,
        apiKey,
      )
        .then((response) => {
          if (onStatusUpdate) {
            onStatusUpdate(`${yesModel} response received for round ${round}`);
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
        [...noConversationHistory, { role: 'user', content: noPrompt }],
        120000,
        apiKey,
      )
        .then((response) => {
          if (onStatusUpdate) {
            onStatusUpdate(`${noModel} response received for round ${round}`);
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
      throw new Error(`Failed to generate response from ${yesModel}. The model may have insufficient credits or encountered an error.`);
    }

    if (!noResponse || !noResponse.content) {
      throw new Error(`Failed to generate response from ${noModel}. The model may have insufficient credits or encountered an error.`);
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
   * Have a judge evaluate the debate.
   */
  async evaluateDebate(
    topic: string,
    rounds: DebateRound[],
    judgeModel: string,
    judgePrompt: string,
    apiKey: string | null,
    onStatusUpdate?: (status: string) => void,
  ): Promise<JudgeEvaluation> {
    const startTime = Date.now();
    this.logger.log(`[Judge ${judgeModel}] Starting evaluation for debate with ${rounds.length} rounds`);

    // Build debate transcript
    const transcript = rounds
      .map(
        (r) =>
          `Round ${r.round}:\n` +
          `FOR (${r.yesMessage.model}): ${r.yesMessage.content}\n\n` +
          `AGAINST (${r.noMessage.model}): ${r.noMessage.content}\n\n`,
      )
      .join('---\n\n');

    const evaluationPrompt = `You are an expert judge evaluating a structured debate.

Debate Topic:
${topic}

Debate Transcript:
${transcript}

Evaluation Criteria:
${judgePrompt || 'Evaluate based on: reasoning quality, evidence strength, factual accuracy, logical consistency, persuasiveness, and overall argumentation quality.'}

Your task:
1. Carefully review the entire debate
2. Evaluate each side's arguments
3. Consider the evaluation criteria provided
4. Determine which side presented the stronger case
5. Provide scores (0-100) for each side
6. Declare a winner (or tie if appropriate)
7. Provide detailed reasoning for your decision

Format your response as follows:

EVALUATION:
[Your detailed evaluation of both sides]

SCORES:
FOR: [score 0-100]
AGAINST: [score 0-100]

WINNER: [FOR/AGAINST/TIE]

REASONING:
[Your detailed reasoning for the scores and winner]`;

    if (onStatusUpdate) {
      onStatusUpdate(`Sending debate transcript to ${judgeModel} for evaluation...`);
    }

    const response = await this.openRouterService.queryModel(
      judgeModel,
      [{ role: 'user', content: evaluationPrompt }],
      120000,
      apiKey,
    ).then((response) => {
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
   */
  private parseScores(text: string): { yes: number; no: number } | undefined {
    const forMatch = text.match(/FOR:\s*(\d+)/i);
    const againstMatch = text.match(/AGAINST:\s*(\d+)/i);

    if (forMatch && againstMatch) {
      return {
        yes: parseInt(forMatch[1], 10),
        no: parseInt(againstMatch[1], 10),
      };
    }

    // Fallback: try to find any numbers
    const numbers = text.match(/\b(\d{1,3})\b/g);
    if (numbers && numbers.length >= 2) {
      return {
        yes: parseInt(numbers[0], 10),
        no: parseInt(numbers[1], 10),
      };
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
    if (avgYes > avgNo + 5) {
      // 5 point threshold to avoid ties
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

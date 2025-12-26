/**
 * Debater Agent - Handles debate arguments for either the "yes" (FOR) or "no" (AGAINST) position.
 */

import { Logger } from '@nestjs/common';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createOpenRouterChatModel, OpenRouterChatModelConfig, OpenRouterChatModel } from './openrouter-chat-model';

export interface DebaterAgentConfig {
  model: string;
  apiKey: string;
  position: 'yes' | 'no';
  topic: string;
  timeout?: number;
}

export interface DebaterResponse {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
}

export class DebaterAgent {
  private readonly logger = new Logger(DebaterAgent.name);
  private chatModel: OpenRouterChatModel;
  private modelName: string;

  constructor(config: DebaterAgentConfig) {
    this.modelName = config.model;
    const modelConfig: OpenRouterChatModelConfig = {
      model: config.model,
      apiKey: config.apiKey,
      temperature: 0.7,
      timeout: config.timeout || 180000,
    };
    this.chatModel = createOpenRouterChatModel(modelConfig) as OpenRouterChatModel;
  }

  /**
   * Generate an opening statement for the debate.
   */
  async generateOpeningStatement(
    topic: string,
    position: 'yes' | 'no',
  ): Promise<DebaterResponse> {
    this.logger.log(`Generating opening statement for ${position} position`);

    const positionText = position === 'yes' ? 'FOR' : 'AGAINST';
    const systemPrompt = `You are participating in a structured debate. You are arguing ${positionText} the proposition.

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

    const messages = [new SystemMessage(systemPrompt)];

    try {
      const response = await this.chatModel.invoke(messages);
      const content = typeof response.content === 'string' ? response.content : String(response.content);
      const usage = this.chatModel.getLastUsage();

      return {
        content,
        usage,
      };
    } catch (error: any) {
      this.logger.error(`Error generating opening statement: ${error.message}`);
      throw new Error(`Failed to generate opening statement: ${error.message}`);
    }
  }

  /**
   * Generate a rebuttal response based on opponent's arguments.
   */
  async generateRebuttal(
    topic: string,
    position: 'yes' | 'no',
    openingStatement: string,
    opponentArguments: string,
    round: number,
    previousRounds?: Array<{ yesMessage: string; noMessage: string; round: number }>,
  ): Promise<DebaterResponse> {
    this.logger.log(`Generating rebuttal for ${position} position, round ${round}`);

    const positionText = position === 'yes' ? 'FOR' : 'AGAINST';
    const opponentPosition = position === 'yes' ? 'AGAINST' : 'FOR';

    let systemContext = `You are participating in a structured debate on the following topic:

${topic}

You are arguing ${positionText} the proposition.

Your opening statement:
${openingStatement}`;

    // Build context from previous rounds if available
    if (previousRounds && previousRounds.length > 0) {
      for (const prevRound of previousRounds) {
        systemContext += `\n\nRebuttal Round ${prevRound.round} - Your opponent's argument:\n${prevRound[position === 'yes' ? 'noMessage' : 'yesMessage']}`;
        systemContext += `\n\nRebuttal Round ${prevRound.round} - Your rebuttal:\n${prevRound[position === 'yes' ? 'yesMessage' : 'noMessage']}`;
      }
    }

    const systemMessage = new SystemMessage(systemContext);

    const userPrompt = round === 1
      ? `This is Rebuttal Round ${round}. Analyze your opponent's opening statement carefully. Dissect their arguments, identify weaknesses, logical fallacies, or unsupported claims. Present strong counterarguments and defend your position. Be thorough and persuasive.

Your opponent's opening statement (${opponentPosition} side):
${opponentArguments}`
      : `This is Rebuttal Round ${round}. Focus on your opponent's arguments from the previous round. Address their specific points, counter their rebuttals, and strengthen your position. Be direct, logical, and persuasive.

Your opponent's argument from Rebuttal Round ${round - 1} (${opponentPosition} side):
${opponentArguments}`;

    const userMessage = new HumanMessage(userPrompt);

    try {
      const response = await this.chatModel.invoke([systemMessage, userMessage]);
      const content = typeof response.content === 'string' ? response.content : String(response.content);
      const usage = this.chatModel.getLastUsage();

      return {
        content,
        usage,
      };
    } catch (error: any) {
      this.logger.error(`Error generating rebuttal: ${error.message}`);
      throw new Error(`Failed to generate rebuttal: ${error.message}`);
    }
  }

  /**
   * Generate a concluding statement for the debate.
   */
  async generateConclusion(
    topic: string,
    position: 'yes' | 'no',
    openingStatement: string,
    debateHistory: Array<{ yesMessage: string; noMessage: string; round: number }>,
  ): Promise<DebaterResponse> {
    this.logger.log(`Generating conclusion for ${position} position`);

    const positionText = position === 'yes' ? 'FOR' : 'AGAINST';

    // Build complete debate history
    let debateHistoryText = `Your opening statement:\n${openingStatement}\n\n`;
    for (const round of debateHistory) {
      const opponentArg = position === 'yes' ? round.noMessage : round.yesMessage;
      const myRebuttal = position === 'yes' ? round.yesMessage : round.noMessage;
      debateHistoryText += `Rebuttal Round ${round.round} - Your opponent's argument:\n${opponentArg}\n\n`;
      debateHistoryText += `Rebuttal Round ${round.round} - Your rebuttal:\n${myRebuttal}\n\n`;
    }

    const systemPrompt = `You are concluding a structured debate. You argued ${positionText} the proposition.

Debate Topic:
${topic}

Complete Debate History:
${debateHistoryText}

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

    const messages = [new SystemMessage(systemPrompt)];

    try {
      const response = await this.chatModel.invoke(messages);
      const content = typeof response.content === 'string' ? response.content : String(response.content);
      const usage = this.chatModel.getLastUsage();

      return {
        content,
        usage,
      };
    } catch (error: any) {
      this.logger.error(`Error generating conclusion: ${error.message}`);
      throw new Error(`Failed to generate conclusion: ${error.message}`);
    }
  }
}


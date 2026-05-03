/**
 * Title Generator Agent - Generates concise titles for debate topics.
 */

import { Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import {
  createOpenRouterChatModel,
  OpenRouterChatModelConfig,
} from './openrouter-chat-model';

export interface TitleGeneratorAgentConfig {
  model: string;
  apiKey: string;
  timeout?: number;
}

export class TitleGeneratorAgent {
  private readonly logger = new Logger(TitleGeneratorAgent.name);
  private chatModel: BaseChatModel;

  constructor(config: TitleGeneratorAgentConfig) {
    const modelConfig: OpenRouterChatModelConfig = {
      model: config.model,
      apiKey: config.apiKey,
      temperature: 0.5, // Lower temperature for more consistent titles
      timeout: config.timeout || 10000,
    };
    this.chatModel = createOpenRouterChatModel(modelConfig);
  }

  /**
   * Generate a concise title from a debate topic.
   */
  async generateTitle(topic: string): Promise<string> {
    this.logger.log('Generating title...');

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

    try {
      const response = await this.chatModel.invoke([
        new HumanMessage(titlePrompt),
      ]);
      const title =
        typeof response.content === 'string'
          ? response.content
          : String(response.content);

      this.logger.log(`Title generated: ${title}`);
      return title.trim();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error generating title: ${errorMessage}`);
      throw new Error(`Failed to generate title: ${errorMessage}`);
    }
  }
}

/**
 * OpenRouter Chat Model integration for LangChain.
 * Creates a custom BaseChatModel that wraps OpenRouter API calls.
 */

import {
  BaseChatModel,
  BaseChatModelCallOptions,
} from '@langchain/core/language_models/chat_models';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  BaseMessage,
  AIMessageChunk,
} from '@langchain/core/messages';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { ChatGenerationChunk, ChatResult } from '@langchain/core/outputs';
import { OpenRouterService, UsageData } from '../../common/openrouter.service';

export interface OpenRouterChatModelConfig {
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * Custom LangChain chat model that integrates with OpenRouter API.
 */
export class OpenRouterChatModel extends BaseChatModel {
  private openRouterService: OpenRouterService;
  private model: string;
  private apiKey: string;
  private temperature?: number;
  private maxTokens?: number;
  private timeout: number;
  private lastUsage?: UsageData; // Store last usage data

  constructor(config: OpenRouterChatModelConfig) {
    super({});
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
    this.timeout = config.timeout || 120000;
    this.openRouterService = new OpenRouterService();
  }

  _llmType(): string {
    return 'openrouter';
  }

  /**
   * Get the last usage data from the most recent API call.
   */
  getLastUsage(): UsageData | undefined {
    return this.lastUsage;
  }

  /**
   * Convert LangChain messages to OpenRouter format.
   */
  private convertMessagesToOpenRouterFormat(
    messages: BaseMessage[],
  ): Array<{ role: string; content: string }> {
    return messages.map((msg) => {
      if (msg instanceof HumanMessage) {
        return { role: 'user', content: msg.content as string };
      } else if (msg instanceof AIMessage) {
        return { role: 'assistant', content: msg.content as string };
      } else if (msg instanceof SystemMessage) {
        return { role: 'system', content: msg.content as string };
      }
      // Fallback
      return { role: 'user', content: String(msg.content) };
    });
  }

  /**
   * Invoke the chat model.
   */
  async _generate(
    messages: BaseMessage[],
    _options?: BaseChatModelCallOptions,
    _runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    const openRouterMessages = this.convertMessagesToOpenRouterFormat(messages);

    const response = await this.openRouterService.queryModel(
      this.model,
      openRouterMessages,
      this.timeout,
      this.apiKey,
    );

    if (!response || !response.content) {
      throw new Error('Failed to get response from OpenRouter');
    }

    // Store usage data
    this.lastUsage = response.usage;

    const aiMessage = new AIMessage(response.content);

    return {
      generations: [
        {
          message: aiMessage,
          text: response.content,
        },
      ],
    };
  }

  /**
   * Stream responses (not fully implemented - returns regular response).
   */
  async *_streamResponseChunks(
    messages: BaseMessage[],
    options?: BaseChatModelCallOptions,
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    const result = await this._generate(messages, options, runManager);
    const chunk = new ChatGenerationChunk({
      message: new AIMessageChunk(result.generations[0].message.content),
      text: result.generations[0].text,
    });
    yield chunk;
  }
}

/**
 * Creates a LangChain chat model instance connected to OpenRouter.
 */
export function createOpenRouterChatModel(
  config: OpenRouterChatModelConfig,
): BaseChatModel {
  return new OpenRouterChatModel(config);
}

/**
 * Convert LangChain messages to format compatible with OpenRouter.
 */
export function convertMessagesToOpenRouterFormat(
  messages: BaseMessage[],
): Array<{ role: string; content: string }> {
  return messages.map((msg) => {
    if (msg instanceof HumanMessage) {
      return { role: 'user', content: msg.content as string };
    } else if (msg instanceof AIMessage) {
      return { role: 'assistant', content: msg.content as string };
    } else if (msg instanceof SystemMessage) {
      return { role: 'system', content: msg.content as string };
    }
    return { role: 'user', content: String(msg.content) };
  });
}

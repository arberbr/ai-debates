import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Res,
  Logger,
  Headers,
} from '@nestjs/common';
import { Response } from 'express';
import { DebateService } from './debate.service';
import { DebateStatusService } from './debate-status.service';
import { StartDebateDto } from './dto/start-debate.dto';
import {
  UsageData,
  OpeningStatements,
  DebateRound,
  Conclusions,
  JudgeEvaluation,
} from './interfaces/debate.interface';
import { DEBATE_CONFIG } from '../common/config';
import { sanitizeInput } from '../common/utils';
import { ExtractApiKey } from '../common/decorators/api-key.decorator';
import { DEBATE_CONSTANTS } from '../common/constants/debate.constants';
import { ApiKeyError, ValidationError } from '../common/exceptions/debate.exceptions';

@Controller('api/debate')
export class DebateController {
  private readonly logger = new Logger(DebateController.name);

  constructor(
    private readonly debateService: DebateService,
    private readonly statusService: DebateStatusService,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startDebate(
    @Body() dto: StartDebateDto,
    @ExtractApiKey() normalizedApiKey: string | null,
    @Res() res: Response,
  ) {
    // Generate debate ID
    const debateId = crypto.randomUUID();

    this.logger.log('Received debate start request', {
      topicLength: dto.topic?.length || 0,
      yesModel: dto.yesModel,
      noModel: dto.noModel,
      rounds: dto.rounds,
      hasApiKey: !!normalizedApiKey,
    });

    // Validate topic length
    if (!dto.topic || dto.topic.trim().length === 0) {
      throw new ValidationError('Topic is required', 'topic');
    }
    if (dto.topic.length > DEBATE_CONSTANTS.TOPIC.MAX_LENGTH) {
      throw new ValidationError(
        `Topic must be ${DEBATE_CONSTANTS.TOPIC.MAX_LENGTH} characters or less. Longer topics are not supported.`,
        'topic',
        dto.topic.length,
      );
    }

    // Set SSE headers
    res.setHeader('Content-Type', DEBATE_CONSTANTS.SSE.HEADERS.CONTENT_TYPE);
    res.setHeader('Cache-Control', DEBATE_CONSTANTS.SSE.HEADERS.CACHE_CONTROL);
    res.setHeader('Connection', DEBATE_CONSTANTS.SSE.HEADERS.CONNECTION);
    res.setHeader('X-Accel-Buffering', DEBATE_CONSTANTS.SSE.HEADERS.X_ACCEL_BUFFERING);

    // Send initial stream start event
    this.sendSSEEvent(res, {
      type: 'stream_start',
      stage: 'stream_start',
      message: 'Debate stream initialized',
      debateId,
      timestamp: new Date().toISOString(),
    });

    // Process and stream events with timeout
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Debate timeout: Process exceeded maximum time limit')),
          DEBATE_CONFIG.timeouts.overallDebate,
        );
      });

      await Promise.race([
        this.processDebateWithStreaming(dto, debateId, res, normalizedApiKey),
        timeoutPromise,
      ]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.sendSSEEvent(res, {
        type: 'error',
        stage: 'error',
        message: errorMessage,
        debateId,
        timestamp: new Date().toISOString(),
      });
    } finally {
      res.end();
    }
  }

  @Get('status/:debateId')
  async getStatus(@Param('debateId') debateId: string) {
    const status = this.statusService.getStatus(debateId);
    if (!status) {
      throw new NotFoundException(`Status not found for debateId: ${debateId}`);
    }
    return status;
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      activeDebates: this.statusService.getStatusCount(),
    };
  }

  @Post('generate-title')
  @HttpCode(HttpStatus.OK)
  async generateTitle(
    @Body() dto: { topic: string },
    @ExtractApiKey() normalizedApiKey: string | null,
  ) {
    const { topic } = dto;

    if (!topic || !topic.trim()) {
      throw new ValidationError('Topic is required', 'topic');
    }

    if (!normalizedApiKey) {
      throw new ApiKeyError();
    }

    this.logger.log('Generating title for topic...');

    try {
      const title = await this.debateService.generateTitle(
        topic,
        normalizedApiKey,
      );

      return {
        success: true,
        title,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error('Title generation failed:', error);
      throw new BadRequestException(`Failed to generate title: ${errorMessage}`);
    }
  }

  /**
   * Send an SSE event to the client
   */
  private sendSSEEvent(res: Response, event: Record<string, unknown>): void {
    const data = JSON.stringify(event);
    res.write(
      `${DEBATE_CONSTANTS.SSE.EVENT_PREFIX}${data}${DEBATE_CONSTANTS.SSE.EVENT_SUFFIX}`,
    );
  }

  /**
   * Process debate with SSE streaming
   */
  private async processDebateWithStreaming(
    dto: StartDebateDto,
    debateId: string,
    res: Response,
    normalizedApiKey: string | null,
  ): Promise<void> {
    // Sanitize inputs
    const topic = sanitizeInput(dto.topic, DEBATE_CONSTANTS.TOPIC.MAX_LENGTH);
    const yesModel = sanitizeInput(dto.yesModel, DEBATE_CONSTANTS.MODEL.MAX_LENGTH);
    const noModel = sanitizeInput(dto.noModel, DEBATE_CONSTANTS.MODEL.MAX_LENGTH);
    const rounds = dto.rounds;
    const judgePrompt = dto.judgePrompt
      ? sanitizeInput(dto.judgePrompt, DEBATE_CONSTANTS.JUDGE_PROMPT.MAX_LENGTH)
      : undefined;
    const title = dto.title
      ? sanitizeInput(dto.title, DEBATE_CONSTANTS.TITLE.MAX_LENGTH)
      : undefined;

    if (!normalizedApiKey) {
      throw new ApiKeyError();
    }

    // Keep original topic for debate participants (they use the original text)
    const originalTopic = topic;

    // Initialize usage accumulator to track total token usage and costs
    const usageAccumulator: { usage: UsageData } = {
      usage: {
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
      },
    };

    try {
      // Use provided title or generate fallback from topic
      const debateTitle = dto.title?.trim() || originalTopic.split('\n')[0].substring(0, 80).trim();

      // Stage 1: Generate opening statements
      this.sendSSEEvent(res, {
        type: 'opening_statements_start',
        stage: 'opening_statements_start',
        message: 'Generating opening statements...',
        debateId,
        timestamp: new Date().toISOString(),
      });

      let openingStatements: OpeningStatements;
      try {
        openingStatements = await this.debateService.generateOpeningStatements(
          originalTopic, // Use original topic for debate participants
          yesModel,
          noModel,
          normalizedApiKey,
          (status) => {
            this.sendSSEEvent(res, {
              type: 'status_update',
              stage: 'opening_statements_start',
              message: status,
              debateId,
              timestamp: new Date().toISOString(),
            });
          },
          usageAccumulator,
        );

        this.sendSSEEvent(res, {
          type: 'opening_statements_complete',
          stage: 'opening_statements_complete',
          data: openingStatements,
          message: 'Opening statements complete',
          debateId,
          timestamp: new Date().toISOString(),
        });
      } catch (openingError: unknown) {
        const errorMessage = openingError instanceof Error ? openingError.message : 'Unknown error occurred during opening statements';
        this.sendSSEEvent(res, {
          type: 'error',
          stage: 'error',
          message: `Error during opening statements: ${errorMessage}`,
          data: { error: errorMessage },
          debateId,
          timestamp: new Date().toISOString(),
        });
        throw openingError;
      }

      // Stage 3: Conduct rebuttal rounds
      this.sendSSEEvent(res, {
        type: 'rebuttals_start',
        stage: 'rebuttals_start',
        message: 'Starting rebuttal rounds...',
        debateId,
        timestamp: new Date().toISOString(),
      });

      const rebuttalRounds: DebateRound[] = [];

      for (let round = 1; round <= rounds; round++) {
        try {
          this.sendSSEEvent(res, {
            type: 'rebuttal_round_start',
            stage: 'rebuttal_round_start',
            data: { round },
            message: `Starting rebuttal round ${round} of ${rounds}...`,
            debateId,
            timestamp: new Date().toISOString(),
          });

          const rebuttalRound = await this.debateService.conductRebuttalRound(
            originalTopic, // Use original topic
            yesModel,
            noModel,
            round,
            openingStatements,
            rebuttalRounds,
            normalizedApiKey,
            (status) => {
              this.sendSSEEvent(res, {
                type: 'status_update',
                stage: 'rebuttal_round_start',
                message: status,
                debateId,
                timestamp: new Date().toISOString(),
              });
            },
            usageAccumulator,
          );

          rebuttalRounds.push(rebuttalRound);

          this.sendSSEEvent(res, {
            type: 'rebuttal_round_complete',
            stage: 'rebuttal_round_complete',
            data: rebuttalRound,
            message: `Rebuttal round ${round} complete`,
            debateId,
            timestamp: new Date().toISOString(),
          });
        } catch (roundError: unknown) {
          const errorMessage = roundError instanceof Error ? roundError.message : 'Unknown error occurred during rebuttal round';
          this.sendSSEEvent(res, {
            type: 'error',
            stage: 'error',
            message: `Error in rebuttal round ${round}: ${errorMessage}`,
            data: { round, error: errorMessage },
            debateId,
            timestamp: new Date().toISOString(),
          });
          throw roundError;
        }
      }

      this.sendSSEEvent(res, {
        type: 'rebuttals_complete',
        stage: 'rebuttals_complete',
        data: { rounds: rebuttalRounds },
        message: 'All rebuttal rounds complete',
        debateId,
        timestamp: new Date().toISOString(),
      });

      // Stage 4: Generate conclusions
      this.sendSSEEvent(res, {
        type: 'conclusions_start',
        stage: 'conclusions_start',
        message: 'Generating conclusions...',
        debateId,
        timestamp: new Date().toISOString(),
      });

      let conclusions: Conclusions;
      try {
        conclusions = await this.debateService.generateConclusions(
          originalTopic,
          yesModel,
          noModel,
          openingStatements,
          rebuttalRounds,
          normalizedApiKey,
          (status) => {
            this.sendSSEEvent(res, {
              type: 'status_update',
              stage: 'conclusions_start',
              message: status,
              debateId,
              timestamp: new Date().toISOString(),
            });
          },
          usageAccumulator,
        );

        this.sendSSEEvent(res, {
          type: 'conclusions_complete',
          stage: 'conclusions_complete',
          data: conclusions,
          message: 'Conclusions complete',
          debateId,
          timestamp: new Date().toISOString(),
        });
      } catch (conclusionError: unknown) {
        const errorMessage = conclusionError instanceof Error ? conclusionError.message : 'Unknown error occurred during conclusions';
        this.sendSSEEvent(res, {
          type: 'error',
          stage: 'error',
          message: `Error during conclusions: ${errorMessage}`,
          data: { error: errorMessage },
          debateId,
          timestamp: new Date().toISOString(),
        });
        throw conclusionError;
      }

      // Stage 5: Judge evaluation
      this.logger.log(`[${debateId}] Starting judge evaluation stage`);
      
      this.sendSSEEvent(res, {
        type: 'judging_start',
        stage: 'judging_start',
        message: 'Judges evaluating debate...',
        debateId,
        timestamp: new Date().toISOString(),
      });

      const judgeModels = DEBATE_CONFIG.judgeModels;
      const uniqueJudgeModels = Array.from(new Set(judgeModels));
      const judgeEvaluations: JudgeEvaluation[] = [];

      for (const judgeModel of uniqueJudgeModels) {
        this.logger.log(`[${debateId}] Starting evaluation with judge: ${judgeModel}`);
        try {
          this.sendSSEEvent(res, {
            type: 'status_update',
            stage: 'judging_progress',
            message: `Judge ${judgeModel} is evaluating the debate...`,
            debateId,
            timestamp: new Date().toISOString(),
          });

          const evaluation = await this.debateService.evaluateDebate(
            originalTopic,
            openingStatements,
            rebuttalRounds,
            conclusions,
            judgeModel,
            judgePrompt || '',
            normalizedApiKey,
            (status) => {
              this.sendSSEEvent(res, {
                type: 'status_update',
                stage: 'judging_progress',
                message: status,
                debateId,
                timestamp: new Date().toISOString(),
              });
            },
            usageAccumulator,
          );

          judgeEvaluations.push(evaluation);
          this.logger.log(`[${debateId}] Judge ${judgeModel} evaluation completed successfully`);

          this.sendSSEEvent(res, {
            type: 'judge_complete',
            stage: 'judge_complete',
            data: evaluation,
            message: `Judge ${judgeModel} evaluation complete`,
            debateId,
            timestamp: new Date().toISOString(),
          });
        } catch (judgeError: unknown) {
          const errorMessage = judgeError instanceof Error ? judgeError.message : 'Unknown error occurred during judge evaluation';
          this.logger.error(`[${debateId}] Judge ${judgeModel} evaluation failed:`, judgeError);
          this.sendSSEEvent(res, {
            type: 'error',
            stage: 'error',
            message: `Error from judge ${judgeModel}: ${errorMessage}`,
            data: { judgeModel, error: errorMessage },
            debateId,
            timestamp: new Date().toISOString(),
          });
          // Continue with other judges even if one fails
        }
      }
      
      this.logger.log(`[${debateId}] Judge evaluation stage complete. Processed ${judgeEvaluations.length} of ${uniqueJudgeModels.length} judges`);

      // Calculate final result
      const finalResult = this.debateService.calculateFinalResult(judgeEvaluations);

      this.sendSSEEvent(res, {
        type: 'judging_complete',
        stage: 'judging_complete',
        data: {
          evaluations: judgeEvaluations,
          finalResult,
        },
        message: 'All judges have completed evaluation',
        debateId,
        timestamp: new Date().toISOString(),
      });

      // Complete
      this.sendSSEEvent(res, {
        type: 'complete',
        stage: 'complete',
        data: {
          debateId,
          topic: originalTopic,
          title: debateTitle,
          yesModel,
          noModel,
          openingStatements,
          rounds: rebuttalRounds,
          conclusions,
          judgeEvaluations,
          finalResult,
          usage: usageAccumulator.usage,
        },
        message: 'Debate process complete',
        debateId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.sendSSEEvent(res, {
        type: 'error',
        stage: 'error',
        message: errorMessage,
        debateId,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}

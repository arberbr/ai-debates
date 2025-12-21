import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Res,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DebateService } from './debate.service';
import { DebateStatusService } from './debate-status.service';
import { StartDebateDto } from './dto/start-debate.dto';

@Controller('api/debate')
export class DebateController {
  private readonly logger = new Logger(DebateController.name);

  constructor(
    private readonly debateService: DebateService,
    private readonly statusService: DebateStatusService,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startDebate(@Body() dto: StartDebateDto, @Res() res: Response) {
    // Generate debate ID
    const debateId = crypto.randomUUID();

    console.log('[DebateController] Received request:', {
      topic: dto.topic?.substring(0, 50) + '...',
      yesModel: dto.yesModel,
      noModel: dto.noModel,
      rounds: dto.rounds,
      hasApiKey: !!dto.api_key,
    });

    // Validate topic length (max 300 characters)
    if (!dto.topic || dto.topic.trim().length === 0) {
      res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Topic is required',
      });
      return;
    }
    if (dto.topic.length > 300) {
      res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Topic must be 300 characters or less. Longer topics are not supported.',
      });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial stream start event
    this.sendSSEEvent(res, {
      type: 'stream_start',
      stage: 'stream_start',
      message: 'Debate stream initialized',
      debateId,
      timestamp: new Date().toISOString(),
    });

    // Process and stream events
    try {
      await this.processDebateWithStreaming(dto, debateId, res);
    } catch (error: any) {
      this.sendSSEEvent(res, {
        type: 'error',
        stage: 'error',
        message: error.message || 'Unknown error occurred',
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

  @Post('generate-title')
  @HttpCode(HttpStatus.OK)
  async generateTitle(@Body() dto: { topic: string; api_key?: string }) {
    const { topic, api_key } = dto;

    if (!topic || !topic.trim()) {
      throw new Error('Topic is required');
    }

    // Normalize api_key
    const normalizedApiKey = api_key && api_key.trim() ? api_key.trim() : null;

    if (!normalizedApiKey) {
      throw new Error('OpenRouter API key is required');
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
    } catch (error: any) {
      this.logger.error('Title generation failed:', error);
      throw new Error(`Failed to generate title: ${error.message}`);
    }
  }

  /**
   * Send an SSE event to the client
   */
  private sendSSEEvent(res: Response, event: any): void {
    const data = JSON.stringify(event);
    res.write(`data: ${data}\n\n`);
  }

  /**
   * Process debate with SSE streaming
   */
  private async processDebateWithStreaming(
    dto: StartDebateDto,
    debateId: string,
    res: Response,
  ): Promise<void> {
    const { topic, yesModel, noModel, rounds, judgePrompt, api_key } = dto;

    // Normalize api_key
    const normalizedApiKey = api_key && api_key.trim() ? api_key.trim() : null;

    if (!normalizedApiKey) {
      throw new Error('OpenRouter API key is required');
    }

    // Keep original topic for debate participants (they use the original text)
    const originalTopic = topic;

    try {
      // Stage 1: Generate title (first step)
      this.sendSSEEvent(res, {
        type: 'title_generation_start',
        stage: 'title_generation_start',
        message: 'Generating debate title...',
        debateId,
        timestamp: new Date().toISOString(),
      });

      let debateTitle: string;
      try {
        debateTitle = await this.debateService.generateTitle(
          originalTopic,
          normalizedApiKey,
          (status) => {
            this.sendSSEEvent(res, {
              type: 'status_update',
              stage: 'title_generation_start',
              message: status,
              debateId,
              timestamp: new Date().toISOString(),
            });
          },
        );

        this.sendSSEEvent(res, {
          type: 'title_generation_complete',
          stage: 'title_generation_complete',
          data: { title: debateTitle },
          message: 'Title generated successfully',
          debateId,
          timestamp: new Date().toISOString(),
        });
      } catch (titleError: any) {
        const errorMessage = titleError.message || 'Unknown error occurred during title generation';
        this.logger.error(`Title generation failed: ${errorMessage}`);
        // Use fallback title
        debateTitle = originalTopic.split('\n')[0].substring(0, 80).trim();
        this.sendSSEEvent(res, {
          type: 'status_update',
          stage: 'title_generation_start',
          message: `Title generation failed, using fallback: ${errorMessage}`,
          debateId,
          timestamp: new Date().toISOString(),
        });
      }

      // Stage 2: Generate opening statements
      this.sendSSEEvent(res, {
        type: 'opening_statements_start',
        stage: 'opening_statements_start',
        message: 'Generating opening statements...',
        debateId,
        timestamp: new Date().toISOString(),
      });

      let openingStatements: any;
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
        );

        this.sendSSEEvent(res, {
          type: 'opening_statements_complete',
          stage: 'opening_statements_complete',
          data: openingStatements,
          message: 'Opening statements complete',
          debateId,
          timestamp: new Date().toISOString(),
        });
      } catch (openingError: any) {
        const errorMessage = openingError.message || 'Unknown error occurred during opening statements';
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

      const rebuttalRounds: any[] = [];

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
        } catch (roundError: any) {
          const errorMessage = roundError.message || 'Unknown error occurred during rebuttal round';
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

      let conclusions: any;
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
        );

        this.sendSSEEvent(res, {
          type: 'conclusions_complete',
          stage: 'conclusions_complete',
          data: conclusions,
          message: 'Conclusions complete',
          debateId,
          timestamp: new Date().toISOString(),
        });
      } catch (conclusionError: any) {
        const errorMessage = conclusionError.message || 'Unknown error occurred during conclusions';
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

      const judgeModels = [
        'openai/gpt-5.2',
        'anthropic/claude-sonnet-4.5',
        'google/gemini-3-pro-preview',
      ];
      
      const uniqueJudgeModels = Array.from(new Set(judgeModels));
      const judgeEvaluations: any[] = [];

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
            judgePrompt,
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
        } catch (judgeError: any) {
          const errorMessage = judgeError.message || 'Unknown error occurred during judge evaluation';
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
        },
        message: 'Debate process complete',
        debateId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.sendSSEEvent(res, {
        type: 'error',
        stage: 'error',
        message: error.message || 'Unknown error occurred',
        debateId,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}

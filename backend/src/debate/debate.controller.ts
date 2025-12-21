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

    // Use a mutable variable for topic (may be rewritten)
    let currentTopic = topic;

    try {
      // Stage 0: Rewrite topic to concise format
      this.sendSSEEvent(res, {
        type: 'topic_rewrite_start',
        stage: 'topic_rewrite_start',
        message: 'Analyzing and rewriting topic...',
        debateId,
        timestamp: new Date().toISOString(),
      });

      try {
        const rewrittenTopic = await this.debateService.rewriteTopic(
          currentTopic,
          normalizedApiKey,
          (status) => {
            this.sendSSEEvent(res, {
              type: 'status_update',
              stage: 'topic_rewrite_progress',
              message: status,
              debateId,
              timestamp: new Date().toISOString(),
            });
          },
        );

        this.sendSSEEvent(res, {
          type: 'topic_rewrite_complete',
          stage: 'topic_rewrite_complete',
          data: { rewrittenTopic },
          message: 'Topic rewritten successfully',
          debateId,
          timestamp: new Date().toISOString(),
        });

        // Update topic to use the rewritten version for the rest of the debate
        currentTopic = rewrittenTopic;
      } catch (rewriteError: any) {
        const errorMessage = rewriteError.message || 'Unknown error occurred during topic rewrite';
        this.logger.warn(`Topic rewrite failed: ${errorMessage}, using original topic`);
        // Continue with original topic if rewrite fails
        this.sendSSEEvent(res, {
          type: 'status_update',
          stage: 'topic_rewrite_progress',
          message: `Topic rewrite failed, using original topic: ${errorMessage}`,
          debateId,
          timestamp: new Date().toISOString(),
        });
      }

      // Stage 1: Analyze topic
      this.sendSSEEvent(res, {
        type: 'analysis_start',
        stage: 'analysis_start',
        message: 'Analyzing topic with debate participants...',
        debateId,
        timestamp: new Date().toISOString(),
      });

      let yesAnalysis: string;
      let noAnalysis: string;
      try {
        // Send status updates during analysis
        this.sendSSEEvent(res, {
          type: 'status_update',
          stage: 'analysis_start',
          message: `Analyzing topic with ${yesModel} (FOR side)...`,
          debateId,
          timestamp: new Date().toISOString(),
        });

        this.sendSSEEvent(res, {
          type: 'status_update',
          stage: 'analysis_start',
          message: `Analyzing topic with ${noModel} (AGAINST side)...`,
          debateId,
          timestamp: new Date().toISOString(),
        });

        const analysisResult = await this.debateService.analyzeTopic(
          currentTopic,
          yesModel,
          noModel,
          normalizedApiKey,
          (status) => {
            // Send progress updates from service
            this.sendSSEEvent(res, {
              type: 'status_update',
              stage: 'analysis_progress',
              message: status,
              debateId,
              timestamp: new Date().toISOString(),
            });
          },
        );
        yesAnalysis = analysisResult.yesAnalysis;
        noAnalysis = analysisResult.noAnalysis;

        this.sendSSEEvent(res, {
          type: 'analysis_complete',
          stage: 'analysis_complete',
          data: { yesAnalysis, noAnalysis },
          message: 'Topic analysis complete',
          debateId,
          timestamp: new Date().toISOString(),
        });
      } catch (analysisError: any) {
        const errorMessage = analysisError.message || 'Unknown error occurred during topic analysis';
        this.sendSSEEvent(res, {
          type: 'error',
          stage: 'error',
          message: `Error during topic analysis: ${errorMessage}`,
          data: { error: errorMessage },
          debateId,
          timestamp: new Date().toISOString(),
        });
        throw analysisError; // Re-throw to be caught by outer try-catch
      }

      // Stage 2: Conduct debate rounds
      this.sendSSEEvent(res, {
        type: 'debate_start',
        stage: 'debate_start',
        message: 'Starting debate rounds...',
        debateId,
        timestamp: new Date().toISOString(),
      });

      const debateRounds: any[] = [];

      for (let round = 1; round <= rounds; round++) {
        try {
          this.sendSSEEvent(res, {
            type: 'round_start',
            stage: 'round_start',
            data: { round },
            message: `Starting round ${round} of ${rounds}...`,
            debateId,
            timestamp: new Date().toISOString(),
          });

          this.sendSSEEvent(res, {
            type: 'status_update',
            stage: 'round_progress',
            message: `Querying ${yesModel} for round ${round} (FOR side)...`,
            debateId,
            timestamp: new Date().toISOString(),
          });

          this.sendSSEEvent(res, {
            type: 'status_update',
            stage: 'round_progress',
            message: `Querying ${noModel} for round ${round} (AGAINST side)...`,
            debateId,
            timestamp: new Date().toISOString(),
          });

          const debateRound = await this.debateService.conductDebateRound(
            currentTopic,
            yesModel,
            noModel,
            round,
            debateRounds,
            yesAnalysis,
            noAnalysis,
            normalizedApiKey,
            (status) => {
              // Send progress updates from service
              this.sendSSEEvent(res, {
                type: 'status_update',
                stage: 'round_progress',
                message: status,
                debateId,
                timestamp: new Date().toISOString(),
              });
            },
          );

          this.sendSSEEvent(res, {
            type: 'status_update',
            stage: 'round_progress',
            message: `Round ${round} responses received, processing...`,
            debateId,
            timestamp: new Date().toISOString(),
          });

          debateRounds.push(debateRound);

          this.sendSSEEvent(res, {
            type: 'round_complete',
            stage: 'round_complete',
            data: debateRound,
            message: `Round ${round} complete`,
            debateId,
            timestamp: new Date().toISOString(),
          });
        } catch (roundError: any) {
          const errorMessage = roundError.message || 'Unknown error occurred during debate round';
          this.sendSSEEvent(res, {
            type: 'error',
            stage: 'error',
            message: `Error in round ${round}: ${errorMessage}`,
            data: { round, error: errorMessage },
            debateId,
            timestamp: new Date().toISOString(),
          });
          throw roundError; // Re-throw to be caught by outer try-catch
        }
      }

      this.sendSSEEvent(res, {
        type: 'debate_complete',
        stage: 'debate_complete',
        data: { rounds: debateRounds },
        message: 'All debate rounds complete',
        debateId,
        timestamp: new Date().toISOString(),
      });

      // Stage 3: Judge evaluation
      this.logger.log(`[${debateId}] Starting judge evaluation stage`);
      
      this.sendSSEEvent(res, {
        type: 'judging_start',
        stage: 'judging_start',
        message: 'Judges evaluating debate...',
        debateId,
        timestamp: new Date().toISOString(),
      });

      // Define judge models and deduplicate using Set to prevent any duplicates
      const judgeModels = [
        'openai/gpt-5.2',
        'anthropic/claude-sonnet-4.5',
        'google/gemini-3-pro-preview',
      ];
      
      // Deduplicate the array in case of any accidental duplicates
      const uniqueJudgeModels = Array.from(new Set(judgeModels));
      
      if (uniqueJudgeModels.length !== judgeModels.length) {
        this.logger.warn(`[${debateId}] Found duplicate judges in array. Original: ${judgeModels.length}, Unique: ${uniqueJudgeModels.length}`);
      }

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
            currentTopic,
            debateRounds,
            judgeModel,
            judgePrompt,
            normalizedApiKey,
            (status) => {
              // Send progress updates from service
              this.sendSSEEvent(res, {
                type: 'status_update',
                stage: 'judging_progress',
                message: status,
                debateId,
                timestamp: new Date().toISOString(),
              });
            },
          );

          this.sendSSEEvent(res, {
            type: 'status_update',
            stage: 'judging_progress',
            message: `Judge ${judgeModel} completed evaluation, parsing results...`,
            debateId,
            timestamp: new Date().toISOString(),
          });

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
      const finalResult = this.debateService.calculateFinalResult(
        judgeEvaluations,
      );

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
          topic: currentTopic,
          yesModel,
          noModel,
          rounds: debateRounds,
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

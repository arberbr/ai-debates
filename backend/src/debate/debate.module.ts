import { Module } from '@nestjs/common';
import { DebateController } from './debate.controller';
import { DebateService } from './debate.service';
import { DebateStatusService } from './debate-status.service';
import { OpenRouterService } from '../common/openrouter.service';

@Module({
  controllers: [DebateController],
  providers: [DebateService, DebateStatusService, OpenRouterService],
  exports: [DebateService, DebateStatusService],
})
export class DebateModule {}

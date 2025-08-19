import { Module } from '@nestjs/common';
import { DatabaseTaskCommunicationService } from './database-task-communication.service';
import { DatabaseTaskCommunicationController } from './database-task-communication.controller';
import { PrismaService } from '@/prisma/prisma.service';
import { CompareModule } from '../compare/compare.module';
import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';
import { RagService } from '@/ai/services/rag.service';
import { LlmBasicPromptService } from '@/ai/services/llmBasicPrompt.service';
import { FeedbackGenerationModule } from '@/ai/feedback-generation/feedback-generation.module';

@Module({
  imports: [CompareModule, FeedbackGenerationModule],
  providers: [DatabaseTaskCommunicationService, PrismaService],
  controllers: [DatabaseTaskCommunicationController],
})
export class DatabaseTaskCommunicationModule {}

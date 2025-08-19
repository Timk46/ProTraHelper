import { Module } from '@nestjs/common';
import { FeedbackGenerationController } from './feedback-generation.controller';
import { FeedbackGenerationService } from './feedback-generation.service';
import { RagService } from '../services/rag.service';
import { LlmBasicPromptService } from '../services/llmBasicPrompt.service';
import { PrismaClient } from '@prisma/client';
import { FeedbackRAGService } from './feedback-rag.service';

@Module({
  controllers: [FeedbackGenerationController],
  providers: [
    FeedbackGenerationService,
    RagService,
    LlmBasicPromptService,
    PrismaClient,
    FeedbackRAGService,
  ],
  exports: [FeedbackGenerationService, FeedbackRAGService],
})
export class FeedbackGenerationModule {}

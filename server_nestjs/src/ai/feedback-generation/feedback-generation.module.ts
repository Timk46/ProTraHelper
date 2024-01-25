import { Module } from '@nestjs/common';
import { FeedbackGenerationController } from './feedback-generation.controller';
import { FeedbackGenerationService } from './feedback-generation.service';
import { RagService } from '../services/rag.service';
import { LlmBasicPromptService } from '../services/llmBasicPrompt.service';

@Module({
  controllers: [FeedbackGenerationController],
  providers: [FeedbackGenerationService, RagService, LlmBasicPromptService],
  exports: [FeedbackGenerationService]
})
export class FeedbackGenerationModule {}

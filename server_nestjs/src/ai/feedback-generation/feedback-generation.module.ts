import { Module } from '@nestjs/common';
import { FeedbackGenerationController } from './feedback-generation.controller';
import { FeedbackGenerationService } from './feedback-generation.service';

@Module({
  controllers: [FeedbackGenerationController],
  providers: [FeedbackGenerationService],
  exports: [FeedbackGenerationService]
})
export class FeedbackGenerationModule {}

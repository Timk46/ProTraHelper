import { Module } from '@nestjs/common';
import { QuestionDataService } from './question-data.service';
import { QuestionDataController } from './question-data.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { FeedbackGenerationModule } from '@/ai/feedback-generation/feedback-generation.module';

@Module({
  providers: [QuestionDataService],
  controllers: [QuestionDataController],
  imports: [PrismaModule, FeedbackGenerationModule],
})
export class QuestionDataModule {}

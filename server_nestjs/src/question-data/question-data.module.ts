import { Module } from '@nestjs/common';
import { QuestionDataService } from './question-data.service';
import { QuestionDataController } from './question-data.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { FeedbackGenerationModule } from '@/ai/feedback-generation/feedback-generation.module';
import { ContentModule } from '@/content/content.module';
import { ContentService } from '@/content/content.service';

@Module({
  providers: [QuestionDataService, ContentService],
  controllers: [QuestionDataController],
  imports: [PrismaModule, FeedbackGenerationModule, ContentModule],
})
export class QuestionDataModule {}

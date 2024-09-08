import { Module } from '@nestjs/common';
import { QuestionDataService } from './question-data.service';
import { QuestionDataController } from './question-data.controller';
import { EditCodeService } from './edit-code.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { FeedbackGenerationModule } from '@/ai/feedback-generation/feedback-generation.module';
import { ContentModule } from '@/content/content.module';
import { ContentService } from '@/content/content.service';
import { UserConceptModule } from '@/graph/user-concept/user-concept.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  providers: [QuestionDataService, EditCodeService, ContentService],
  controllers: [QuestionDataController],
  imports: [
    PrismaModule,
    FeedbackGenerationModule,
    ContentModule,
    UserConceptModule,
    NotificationModule,
  ],
  exports: [QuestionDataService],
})
export class QuestionDataModule {}

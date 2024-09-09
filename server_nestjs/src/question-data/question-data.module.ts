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
import { QuestionDataFreetextService } from './question-data-freetext/question-data-freetext.service';
import { QuestionDataCodeService } from './question-data-code/question-data-code.service';
import { QuestionDataFillinService } from './question-data-fillin/question-data-fillin.service';
import { QuestionDataChoiceService } from './question-data-choice/question-data-choice.service';

@Module({
  providers: [
    QuestionDataService,
    QuestionDataChoiceService,
    QuestionDataFreetextService,
    QuestionDataCodeService,
    QuestionDataFillinService,
    EditCodeService,
    ContentService,
  ],
  controllers: [QuestionDataController],
  imports: [
    PrismaModule,
    FeedbackGenerationModule,
    ContentModule,
    UserConceptModule,
    NotificationModule,
  ],
  exports: [
    QuestionDataService,
  ],
})
export class QuestionDataModule {}

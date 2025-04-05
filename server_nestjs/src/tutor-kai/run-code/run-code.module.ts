import { Module } from '@nestjs/common';
import { RunCodeService } from './run-code.service';
import { RunCodeController } from './run-code.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CryptoService } from '../langgraph-feedback/helper/crypto.service';
import { QuestionService } from '../question/question.service';
import { StudentRatingService } from './student-rating.service';
import { ContentService } from '@/content/content.service';
import { ContentModule } from '@/content/content.module';
import { UserConceptModule } from '@/graph/user-concept/user-concept.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  providers: [RunCodeService, CryptoService, QuestionService, StudentRatingService, ContentService],
  imports: [PrismaModule, ContentModule, UserConceptModule, NotificationModule],
  controllers: [RunCodeController],
  exports: [RunCodeService],
})
export class RunCodeModule {}

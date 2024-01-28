import { Module } from '@nestjs/common';
import { RunCodeService } from './run-code.service';
import { RunCodeController } from './run-code.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CryptoService } from '../crypto/crypto.service';
import { QuestionService } from '../question/question.service';
import { FeedbackNormalService } from './feedback_normal.service';
import { StudentRatingService } from './student-rating.service';
import { FeedbackRAGService } from './feedback_rag.service';

@Module({
  providers: [RunCodeService, CryptoService, QuestionService, FeedbackNormalService, StudentRatingService, FeedbackRAGService],
  imports: [PrismaModule],
  controllers: [RunCodeController],
})
export class RunCodeModule {}

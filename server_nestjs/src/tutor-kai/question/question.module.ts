import { Module } from '@nestjs/common';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  providers: [QuestionService],
  controllers: [QuestionController],
  imports: [PrismaModule]
})
export class QuestionModule {}

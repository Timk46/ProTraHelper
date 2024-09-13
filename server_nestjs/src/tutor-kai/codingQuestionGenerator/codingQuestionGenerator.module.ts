import { Module } from '@nestjs/common';
import { CodingQuestionGeneratorService } from './codingQuestionGenerator.service';
import { CodingQuestionGeneratorController } from './codingQuestionGenerator.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  providers: [CodingQuestionGeneratorService],
  controllers: [CodingQuestionGeneratorController],
  imports: [PrismaModule, ConfigModule.forRoot()],
})
export class CodingQuestionGeneratorModule {}

import { Module } from '@nestjs/common';
import { CodingQuestionGeneratorService } from './codingQuestionGenerator.service';
import { CodingQuestionGeneratorCppService } from './codingQuestionGeneratorCPP.service';
import { CodingQuestionGeneratorController } from './codingQuestionGenerator.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  providers: [CodingQuestionGeneratorService,  CodingQuestionGeneratorCppService],
  controllers: [CodingQuestionGeneratorController],
  imports: [PrismaModule, ConfigModule.forRoot()],
})
export class CodingQuestionGeneratorModule {}

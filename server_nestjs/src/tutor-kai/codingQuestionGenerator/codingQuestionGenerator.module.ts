import { Module } from '@nestjs/common';
import { CodingQuestionGeneratorService } from './codingQuestionGenerator.service';
import { CodingQuestionGeneratorCppService } from './codingQuestionGeneratorCPP.service';
import { CodingQuestionGeneratorController } from './codingQuestionGenerator.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { RunCodeModule } from '../run-code/run-code.module';
@Module({
  providers: [CodingQuestionGeneratorService,  CodingQuestionGeneratorCppService],
  controllers: [CodingQuestionGeneratorController],
  imports: [RunCodeModule, PrismaModule, ConfigModule.forRoot()],
})
export class CodingQuestionGeneratorModule {}

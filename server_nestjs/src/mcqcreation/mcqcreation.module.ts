/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { McqCreationService } from './mcqcreation.service';
import { McqcreationController } from './mcqcreation.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { JsonLoaderService } from './jsonloader.service';
import { HttpModule } from '@nestjs/axios';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { RagService } from '@/ai/services/rag.service';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [McqCreationService, JsonLoaderService, EvaluationService, RagService],
  controllers: [McqcreationController] //, EvaluationController] CURRENTLY DISABLED
})
export class McqCreationModule {}

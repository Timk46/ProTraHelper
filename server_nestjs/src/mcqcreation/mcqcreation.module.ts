/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { McqCreationService } from './mcqcreation.service';
import { McqcreationController } from './mcqcreation.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { RagService } from '@/ai/services/rag.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    CacheModule.register({
      isGlobal: true,
      ttl: 10000,
    }),
  ],
  providers: [McqCreationService, RagService],
  controllers: [McqcreationController], //, EvaluationController] CURRENTLY DISABLED
})
export class McqCreationModule {}

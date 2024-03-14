import { Module } from '@nestjs/common';
import { McqevaluationService } from './mcqevaluation.service';
import { McqevaluationController } from './mcqevaluation.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { McqCreationService } from '@/mcqcreation/mcqcreation.service';
import { JsonLoaderService } from '@/mcqcreation/jsonloader.service';
import { ContentService } from '@/content/content.service';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [
    McqevaluationService,
    McqCreationService,
    JsonLoaderService,
    ContentService,
  ],
  controllers: [McqevaluationController],
})
export class McqevaluationModule {}

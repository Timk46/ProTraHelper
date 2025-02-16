import { Module } from '@nestjs/common';
import { GptController } from './gpt.controller';
import { GptService } from './gpt.service';
import { SimilarityCompareService } from '../compare/similarity-compare.service';
import { PrismaModule } from '@/prisma/prisma.module';



@Module({
  controllers: [GptController],
  providers: [GptService, SimilarityCompareService],
  imports: [PrismaModule]
})
export class GptModule {}

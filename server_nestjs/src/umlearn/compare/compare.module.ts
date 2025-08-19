import { Module } from '@nestjs/common';
import { CompareService } from './compare.service';
import { CompareController } from './compare.controller';
import { PointCalculationService } from '../point-calculation/point-calculation.service';
import { SimilarityCompareService } from './similarity-compare.service';

@Module({
  providers: [CompareService, SimilarityCompareService, PointCalculationService],
  controllers: [CompareController],
  exports: [CompareService, SimilarityCompareService],
})
export class CompareModule {}

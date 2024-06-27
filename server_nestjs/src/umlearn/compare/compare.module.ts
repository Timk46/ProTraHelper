import { Module } from '@nestjs/common';
import { CompareService } from './compare.service';
import { CompareController } from './compare.controller';
import { PointCalculationService } from '../point-calculation/point-calculation.service';

@Module({
  providers: [CompareService, PointCalculationService],
  controllers: [CompareController],
  exports: [CompareService]
})
export class CompareModule {}

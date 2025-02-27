import { Module } from '@nestjs/common';
import { PointCalculationService } from './point-calculation.service';
import { PointCalculationController } from './point-calculation.controller';

@Module({
  providers: [PointCalculationService],
  controllers: [PointCalculationController]
})
export class PointCalculationModule {}

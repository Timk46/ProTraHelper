import { Module } from '@nestjs/common';
import { GraphSolutionEvaluationService } from './graph-solution-evaluation.service';

@Module({
  providers: [GraphSolutionEvaluationService],
  exports: [GraphSolutionEvaluationService],
})
export class GraphSolutionEvaluationModule {}

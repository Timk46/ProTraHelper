import { Module } from '@nestjs/common';
import { GraphSolutionEvaluationService } from './graph-solution-evaluation.service';
import { TransitiveClosureService } from './transitive-closure/transitive-closure.service';

@Module({
  providers: [GraphSolutionEvaluationService, TransitiveClosureService],
  exports: [GraphSolutionEvaluationService],
})
export class GraphSolutionEvaluationModule {}

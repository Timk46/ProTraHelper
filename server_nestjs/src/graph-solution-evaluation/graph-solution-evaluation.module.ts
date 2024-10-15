import { Module } from '@nestjs/common';
import { GraphSolutionEvaluationService } from './graph-solution-evaluation.service';
import { TransitiveClosureService } from './transitive-closure/transitive-closure.service';
import { DijkstraService } from './dijkstra/dijkstra.service';

@Module({
  providers: [GraphSolutionEvaluationService, TransitiveClosureService, DijkstraService],
  exports: [GraphSolutionEvaluationService],
})
export class GraphSolutionEvaluationModule {}

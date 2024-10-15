import { Module } from '@nestjs/common';
import { GraphSolutionEvaluationService } from './graph-solution-evaluation.service';
import { TransitiveClosureService } from './transitive-closure/transitive-closure.service';
import { DijkstraService } from './dijkstra/dijkstra.service';
import { FloydService } from './floyd/floyd.service';

@Module({
  providers: [GraphSolutionEvaluationService, TransitiveClosureService, DijkstraService, FloydService],
  exports: [GraphSolutionEvaluationService],
})
export class GraphSolutionEvaluationModule {}

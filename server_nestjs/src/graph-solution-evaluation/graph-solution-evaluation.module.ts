import { Module } from '@nestjs/common';
import { GraphSolutionEvaluationService } from './graph-solution-evaluation.service';
import { TransitiveClosureService } from './transitive-closure/transitive-closure.service';
import { DijkstraService } from './dijkstra/dijkstra.service';
import { FloydService } from './floyd/floyd.service';
import { KruskalService } from './kruskal/kruskal.service';

@Module({
  providers: [GraphSolutionEvaluationService, TransitiveClosureService, DijkstraService, FloydService, KruskalService],
  exports: [GraphSolutionEvaluationService],
})
export class GraphSolutionEvaluationModule {}

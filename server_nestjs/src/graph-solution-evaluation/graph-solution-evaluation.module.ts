import { Module } from '@nestjs/common';
import { GraphSolutionEvaluationService } from './graph-solution-evaluation.service';
import { TransitiveClosureService } from './transitive-closure/transitive-closure.service';
import { DijkstraService } from './dijkstra/dijkstra.service';
import { FloydService } from './floyd/floyd.service';
import { KruskalService } from './kruskal/kruskal.service';
import { FeedbackGenerationModule } from '@/ai/feedback-generation/feedback-generation.module';

@Module({
  providers: [GraphSolutionEvaluationService, TransitiveClosureService, DijkstraService, FloydService, KruskalService],
  imports: [FeedbackGenerationModule],
  exports: [GraphSolutionEvaluationService],
})
export class GraphSolutionEvaluationModule {}

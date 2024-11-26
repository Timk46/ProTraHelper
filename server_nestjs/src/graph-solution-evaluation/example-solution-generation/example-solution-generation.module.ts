import { Module } from '@nestjs/common';
import { ExampleSolutionGenerationService } from './example-solution-generation.service';
import { ExampleSolutionGenerationController } from './example-solution-generation.controller';
import { GraphSolutionEvaluationModule } from '../graph-solution-evaluation.module';
import { TransitiveClosureService } from '../transitive-closure/transitive-closure.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { FloydService } from '../floyd/floyd.service';
import { DijkstraService } from '../dijkstra/dijkstra.service';
import { KruskalService } from '../kruskal/kruskal.service';

@Module({
  controllers: [ExampleSolutionGenerationController],
  providers: [ExampleSolutionGenerationService, TransitiveClosureService, FloydService, DijkstraService, KruskalService],
  imports: [PrismaModule, GraphSolutionEvaluationModule],
})
export class ExampleSolutionGenerationModule {}

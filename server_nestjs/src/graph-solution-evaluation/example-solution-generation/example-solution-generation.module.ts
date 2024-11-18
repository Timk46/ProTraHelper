import { Module } from '@nestjs/common';
import { ExampleSolutionGenerationService } from './example-solution-generation.service';
import { ExampleSolutionGenerationController } from './example-solution-generation.controller';
import { GraphSolutionEvaluationModule } from '../graph-solution-evaluation.module';
import { TransitiveClosureService } from '../transitive-closure/transitive-closure.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  controllers: [ExampleSolutionGenerationController],
  providers: [ExampleSolutionGenerationService, TransitiveClosureService],
  imports: [PrismaModule, GraphSolutionEvaluationModule],
})
export class ExampleSolutionGenerationModule {}

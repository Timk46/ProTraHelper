import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ExampleSolutionGenerationService } from './example-solution-generation.service';
import { CreateExampleSolutionGenerationDto } from './dto/create-example-solution-generation.dto';
import { roles, RolesGuard } from '@/auth/roles.guard';

@UseGuards(RolesGuard)
@Controller('graph-example-solution-generation')
export class ExampleSolutionGenerationController {
  constructor(private readonly exampleSolutionGenerationService: ExampleSolutionGenerationService) {}

  @roles('ADMIN')
  @Post('/dijkstra')
  generateDijkstraExampleSolution(@Body() createExampleSolutionGenerationDto: CreateExampleSolutionGenerationDto) {
    return this.exampleSolutionGenerationService.generateDijkstraExampleSolution(createExampleSolutionGenerationDto.initialStructure);
  }
  
  @roles('ADMIN')
  @Post('/kruskal')
  generateKruskalExampleSolution(@Body() createExampleSolutionGenerationDto: CreateExampleSolutionGenerationDto) {
    return this.exampleSolutionGenerationService.generateKruskalExampleSolution(createExampleSolutionGenerationDto.initialStructure);
  }
  
  @roles('ADMIN')
  @Post('/floyd')
  generateFloydExampleSolution(@Body() createExampleSolutionGenerationDto: CreateExampleSolutionGenerationDto) {
    return this.exampleSolutionGenerationService.generateFloydExampleSolution(createExampleSolutionGenerationDto.initialStructure);
  }
  
  @roles('ADMIN')
  @Post('/transitive-closure')
  generateTransitiveClosureExampleSolution(@Body() createExampleSolutionGenerationDto: CreateExampleSolutionGenerationDto) {
    return this.exampleSolutionGenerationService.generateTransitiveClosureExampleSolution(createExampleSolutionGenerationDto.initialStructure);
  }

}

import { Test, TestingModule } from '@nestjs/testing';
import { ExampleSolutionGenerationController } from './example-solution-generation.controller';
import { ExampleSolutionGenerationService } from './example-solution-generation.service';

describe('ExampleSolutionGenerationController', () => {
  let controller: ExampleSolutionGenerationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExampleSolutionGenerationController],
      providers: [ExampleSolutionGenerationService],
    }).compile();

    controller = module.get<ExampleSolutionGenerationController>(
      ExampleSolutionGenerationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

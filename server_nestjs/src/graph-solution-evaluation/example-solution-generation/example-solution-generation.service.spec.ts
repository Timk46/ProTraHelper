import { Test, TestingModule } from '@nestjs/testing';
import { ExampleSolutionGenerationService } from './example-solution-generation.service';

describe('ExampleSolutionGenerationService', () => {
  let service: ExampleSolutionGenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExampleSolutionGenerationService],
    }).compile();

    service = module.get<ExampleSolutionGenerationService>(ExampleSolutionGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

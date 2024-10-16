import { Test, TestingModule } from '@nestjs/testing';
import { GraphSolutionEvaluationService } from './graph-solution-evaluation.service';

describe('GraphSolutionEvaluationService', () => {
  let service: GraphSolutionEvaluationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphSolutionEvaluationService],
    }).compile();

    service = module.get<GraphSolutionEvaluationService>(GraphSolutionEvaluationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

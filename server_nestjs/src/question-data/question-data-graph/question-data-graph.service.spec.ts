import { Test, TestingModule } from '@nestjs/testing';
import { QuestionDataGraphService } from './question-data-graph.service';

describe('QuestionDataGraphService', () => {
  let service: QuestionDataGraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionDataGraphService],
    }).compile();

    service = module.get<QuestionDataGraphService>(QuestionDataGraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

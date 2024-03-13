import { Test, TestingModule } from '@nestjs/testing';
import { McqevaluationService } from './mcqevaluation.service';

describe('McqevaluationService', () => {
  let service: McqevaluationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [McqevaluationService],
    }).compile();

    service = module.get<McqevaluationService>(McqevaluationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

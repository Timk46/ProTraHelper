import { Test, TestingModule } from '@nestjs/testing';
import { CodeGameEvaluationService } from './code-game-evaluation.service';

describe('CodeGameEvaluationService', () => {
  let service: CodeGameEvaluationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodeGameEvaluationService],
    }).compile();

    service = module.get<CodeGameEvaluationService>(CodeGameEvaluationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

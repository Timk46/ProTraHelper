import { Test, TestingModule } from '@nestjs/testing';
import { QuestionDataFillinService } from './question-data-fillin.service';

describe('QuestionDataFillinService', () => {
  let service: QuestionDataFillinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionDataFillinService],
    }).compile();

    service = module.get<QuestionDataFillinService>(QuestionDataFillinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

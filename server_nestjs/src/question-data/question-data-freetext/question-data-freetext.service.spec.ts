import { Test, TestingModule } from '@nestjs/testing';
import { QuestionDataFreetextService } from './question-data-freetext.service';

describe('QuestionDataFreetextService', () => {
  let service: QuestionDataFreetextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionDataFreetextService],
    }).compile();

    service = module.get<QuestionDataFreetextService>(QuestionDataFreetextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

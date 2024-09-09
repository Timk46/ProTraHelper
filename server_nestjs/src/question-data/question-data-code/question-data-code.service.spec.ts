import { Test, TestingModule } from '@nestjs/testing';
import { QuestionDataCodeService } from './question-data-code.service';

describe('QuestionDataCodeService', () => {
  let service: QuestionDataCodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionDataCodeService],
    }).compile();

    service = module.get<QuestionDataCodeService>(QuestionDataCodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

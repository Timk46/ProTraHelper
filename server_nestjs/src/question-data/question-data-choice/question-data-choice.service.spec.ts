import { Test, TestingModule } from '@nestjs/testing';
import { QuestionDataChoiceService } from './question-data-choice.service';

describe('QuestionDataChoiceService', () => {
  let service: QuestionDataChoiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionDataChoiceService],
    }).compile();

    service = module.get<QuestionDataChoiceService>(QuestionDataChoiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

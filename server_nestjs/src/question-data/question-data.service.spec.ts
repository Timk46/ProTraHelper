import { Test, TestingModule } from '@nestjs/testing';
import { QuestionDataService } from './question-data.service';

describe('QuestionDataService', () => {
  let service: QuestionDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionDataService],
    }).compile();

    service = module.get<QuestionDataService>(QuestionDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

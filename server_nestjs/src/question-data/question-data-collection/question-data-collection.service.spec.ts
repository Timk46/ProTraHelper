import { Test, TestingModule } from '@nestjs/testing';
import { QuestionDataCollectionService } from './question-data-collection.service';

describe('QuestionDataCollectionService', () => {
  let service: QuestionDataCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionDataCollectionService],
    }).compile();

    service = module.get<QuestionDataCollectionService>(QuestionDataCollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

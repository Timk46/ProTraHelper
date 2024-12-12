import { Test, TestingModule } from '@nestjs/testing';
import { QuestionDataCodeGameService } from './question-data-code-game.service';

describe('QuestionDataCodeGameService', () => {
  let service: QuestionDataCodeGameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionDataCodeGameService],
    }).compile();

    service = module.get<QuestionDataCodeGameService>(QuestionDataCodeGameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

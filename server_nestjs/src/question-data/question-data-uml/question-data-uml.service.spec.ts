import { Test, TestingModule } from '@nestjs/testing';
import { QuestionDataUmlService } from './question-data-uml.service';

describe('QuestionDataUmlService', () => {
  let service: QuestionDataUmlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionDataUmlService],
    }).compile();

    service = module.get<QuestionDataUmlService>(QuestionDataUmlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

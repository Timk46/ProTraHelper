import { Test, TestingModule } from '@nestjs/testing';
import { QuestionDataUploadService } from './question-data-upload.service';

describe('QuestionDataUploadService', () => {
  let service: QuestionDataUploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionDataUploadService],
    }).compile();

    service = module.get<QuestionDataUploadService>(QuestionDataUploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

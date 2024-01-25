import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackGenerationService } from './feedback-generation.service';

describe('FeedbackGenerationService', () => {
  let service: FeedbackGenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeedbackGenerationService],
    }).compile();

    service = module.get<FeedbackGenerationService>(FeedbackGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AiFeedbackService } from './ai-feedback.service';

describe('AiFeedbackService', () => {
  let service: AiFeedbackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiFeedbackService],
    }).compile();

    service = module.get<AiFeedbackService>(AiFeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

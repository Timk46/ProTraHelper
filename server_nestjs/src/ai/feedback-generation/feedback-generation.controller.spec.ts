import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackGenerationController } from './feedback-generation.controller';

describe('FeedbackGenerationController', () => {
  let controller: FeedbackGenerationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackGenerationController],
    }).compile();

    controller = module.get<FeedbackGenerationController>(FeedbackGenerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

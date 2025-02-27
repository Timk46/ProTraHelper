import { Test, TestingModule } from '@nestjs/testing';
import { AiFeedbackController } from './ai-feedback.controller';
import { AiFeedbackService } from './ai-feedback.service';

describe('AiFeedbackController', () => {
  let controller: AiFeedbackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiFeedbackController],
      providers: [AiFeedbackService],
    }).compile();

    controller = module.get<AiFeedbackController>(AiFeedbackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

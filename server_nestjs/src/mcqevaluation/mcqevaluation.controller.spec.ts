import { Test, TestingModule } from '@nestjs/testing';
import { McqevaluationController } from './mcqevaluation.controller';

describe('McqevaluationController', () => {
  let controller: McqevaluationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [McqevaluationController],
    }).compile();

    controller = module.get<McqevaluationController>(McqevaluationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { QuestionDataController } from './question-data.controller';

describe('QuestionDataController', () => {
  let controller: QuestionDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionDataController],
    }).compile();

    controller = module.get<QuestionDataController>(QuestionDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

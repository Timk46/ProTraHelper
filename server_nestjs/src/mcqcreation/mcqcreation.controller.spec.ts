import { Test, TestingModule } from '@nestjs/testing';
import { McqcreationController } from './mcqcreation.controller';

describe('McqcreationController', () => {
  let controller: McqcreationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [McqcreationController],
    }).compile();

    controller = module.get<McqcreationController>(McqcreationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

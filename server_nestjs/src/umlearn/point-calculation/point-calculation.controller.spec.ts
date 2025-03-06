import { Test, TestingModule } from '@nestjs/testing';
import { PointCalculationController } from './point-calculation.controller';

describe('PointCalculationController', () => {
  let controller: PointCalculationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointCalculationController],
    }).compile();

    controller = module.get<PointCalculationController>(PointCalculationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

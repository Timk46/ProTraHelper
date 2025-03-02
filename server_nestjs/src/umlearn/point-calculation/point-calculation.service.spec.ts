import { Test, TestingModule } from '@nestjs/testing';
import { PointCalculationService } from './point-calculation.service';

describe('PointCalculationService', () => {
  let service: PointCalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PointCalculationService],
    }).compile();

    service = module.get<PointCalculationService>(PointCalculationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

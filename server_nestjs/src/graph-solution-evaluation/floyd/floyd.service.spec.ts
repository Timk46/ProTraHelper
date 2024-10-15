import { Test, TestingModule } from '@nestjs/testing';
import { FloydService } from './floyd.service';

describe('FloydService', () => {
  let service: FloydService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FloydService],
    }).compile();

    service = module.get<FloydService>(FloydService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

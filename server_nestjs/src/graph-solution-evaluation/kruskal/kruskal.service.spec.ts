import { Test, TestingModule } from '@nestjs/testing';
import { KruskalService } from './kruskal.service';

describe('KruskalService', () => {
  let service: KruskalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KruskalService],
    }).compile();

    service = module.get<KruskalService>(KruskalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

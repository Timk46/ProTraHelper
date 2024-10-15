import { Test, TestingModule } from '@nestjs/testing';
import { DijkstraService } from './dijkstra.service';

describe('DijkstraService', () => {
  let service: DijkstraService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DijkstraService],
    }).compile();

    service = module.get<DijkstraService>(DijkstraService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { TransitiveClosureService } from './transitive-closure.service';

describe('TransitiveClosureService', () => {
  let service: TransitiveClosureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransitiveClosureService],
    }).compile();

    service = module.get<TransitiveClosureService>(TransitiveClosureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

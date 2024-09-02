import { Test, TestingModule } from '@nestjs/testing';
import { ContentLinkerService } from './content-linker.service';

describe('ContentLinkerService', () => {
  let service: ContentLinkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentLinkerService],
    }).compile();

    service = module.get<ContentLinkerService>(ContentLinkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

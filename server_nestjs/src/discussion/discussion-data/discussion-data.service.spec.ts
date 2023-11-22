import { Test, TestingModule } from '@nestjs/testing';
import { DiscussionDataService } from './discussion-data.service';

describe('DiscussionDataService', () => {
  let service: DiscussionDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscussionDataService],
    }).compile();

    service = module.get<DiscussionDataService>(DiscussionDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

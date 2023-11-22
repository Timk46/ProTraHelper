import { Test, TestingModule } from '@nestjs/testing';
import { DiscussionListService } from './discussion-list.service';

describe('DiscussionListService', () => {
  let service: DiscussionListService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscussionListService],
    }).compile();

    service = module.get<DiscussionListService>(DiscussionListService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

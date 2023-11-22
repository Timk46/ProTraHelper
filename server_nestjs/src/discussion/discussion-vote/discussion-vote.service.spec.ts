import { Test, TestingModule } from '@nestjs/testing';
import { DiscussionVoteService } from './discussion-vote.service';

describe('DiscussionVoteService', () => {
  let service: DiscussionVoteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscussionVoteService],
    }).compile();

    service = module.get<DiscussionVoteService>(DiscussionVoteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

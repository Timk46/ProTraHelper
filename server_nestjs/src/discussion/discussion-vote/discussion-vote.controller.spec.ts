import { Test, TestingModule } from '@nestjs/testing';
import { DiscussionVoteController } from './discussion-vote.controller';

describe('DiscussionVoteController', () => {
  let controller: DiscussionVoteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscussionVoteController],
    }).compile();

    controller = module.get<DiscussionVoteController>(DiscussionVoteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

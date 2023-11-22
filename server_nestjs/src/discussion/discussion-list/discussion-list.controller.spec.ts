import { Test, TestingModule } from '@nestjs/testing';
import { DiscussionListController } from './discussion-list.controller';

describe('DiscussionListController', () => {
  let controller: DiscussionListController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscussionListController],
    }).compile();

    controller = module.get<DiscussionListController>(DiscussionListController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

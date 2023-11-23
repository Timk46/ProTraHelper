import { Test, TestingModule } from '@nestjs/testing';
import { DiscussionViewController } from './discussion-view.controller';

describe('DiscussionViewController', () => {
  let controller: DiscussionViewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscussionViewController],
    }).compile();

    controller = module.get<DiscussionViewController>(DiscussionViewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

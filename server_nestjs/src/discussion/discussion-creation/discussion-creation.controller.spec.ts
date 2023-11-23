import { Test, TestingModule } from '@nestjs/testing';
import { DiscussionCreationController } from './discussion-creation.controller';

describe('DiscussionCreationController', () => {
  let controller: DiscussionCreationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscussionCreationController],
    }).compile();

    controller = module.get<DiscussionCreationController>(DiscussionCreationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

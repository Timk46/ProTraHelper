import { Test, TestingModule } from '@nestjs/testing';
import { DiscussionViewService } from './discussion-view.service';

describe('DiscussionViewService', () => {
  let service: DiscussionViewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscussionViewService],
    }).compile();

    service = module.get<DiscussionViewService>(DiscussionViewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DiscussionCreationService } from './discussion-creation.service';

describe('DiscussionCreationService', () => {
  let service: DiscussionCreationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscussionCreationService],
    }).compile();

    service = module.get<DiscussionCreationService>(DiscussionCreationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

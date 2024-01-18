import { Test, TestingModule } from '@nestjs/testing';
import { TaskOverviewService } from './task-overview.service';

describe('TaskOverviewService', () => {
  let service: TaskOverviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskOverviewService],
    }).compile();

    service = module.get<TaskOverviewService>(TaskOverviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

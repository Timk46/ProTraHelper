import { Test, TestingModule } from '@nestjs/testing';
import { TaskOverviewController } from './task-overview.controller';

describe('TaskOverviewController', () => {
  let controller: TaskOverviewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskOverviewController],
    }).compile();

    controller = module.get<TaskOverviewController>(TaskOverviewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

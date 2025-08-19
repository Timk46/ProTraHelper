import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseTaskCommunicationController } from './database-task-communication.controller';

describe('DatabaseTaskCommunicationController', () => {
  let controller: DatabaseTaskCommunicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatabaseTaskCommunicationController],
    }).compile();

    controller = module.get<DatabaseTaskCommunicationController>(
      DatabaseTaskCommunicationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

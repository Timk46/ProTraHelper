import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseTaskCommunicationService } from './database-task-communication.service';

describe('DatabaseTaskCommunicationService', () => {
  let service: DatabaseTaskCommunicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseTaskCommunicationService],
    }).compile();

    service = module.get<DatabaseTaskCommunicationService>(DatabaseTaskCommunicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

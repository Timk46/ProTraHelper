import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseCourseCommunicationService } from './database-course-communication.service';

describe('DatabaseCourseCommunicationService', () => {
  let service: DatabaseCourseCommunicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseCourseCommunicationService],
    }).compile();

    service = module.get<DatabaseCourseCommunicationService>(DatabaseCourseCommunicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

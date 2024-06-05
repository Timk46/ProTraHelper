import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseCourseCommunicationController } from './database-course-communication.controller';

describe('DatabaseCourseCommunicationController', () => {
  let controller: DatabaseCourseCommunicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatabaseCourseCommunicationController],
    }).compile();

    controller = module.get<DatabaseCourseCommunicationController>(DatabaseCourseCommunicationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

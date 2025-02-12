import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseEditorCommunicationService } from './database-editor-communication.service';

describe('DatabaseEditorCommunicationService', () => {
  let service: DatabaseEditorCommunicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseEditorCommunicationService],
    }).compile();

    service = module.get<DatabaseEditorCommunicationService>(DatabaseEditorCommunicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

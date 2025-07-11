import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseEditorCommunicationController } from './database-editor-communication.controller';

describe('DatabaseEditorCommunicationController', () => {
  let controller: DatabaseEditorCommunicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatabaseEditorCommunicationController],
    }).compile();

    controller = module.get<DatabaseEditorCommunicationController>(
      DatabaseEditorCommunicationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

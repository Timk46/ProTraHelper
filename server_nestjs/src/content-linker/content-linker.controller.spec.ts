import { Test, TestingModule } from '@nestjs/testing';
import { ContentLinkerController } from './content-linker.controller';

describe('ContentLinkerController', () => {
  let controller: ContentLinkerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentLinkerController],
    }).compile();

    controller = module.get<ContentLinkerController>(ContentLinkerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

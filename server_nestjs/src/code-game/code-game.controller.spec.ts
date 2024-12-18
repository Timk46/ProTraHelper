import { Test, TestingModule } from '@nestjs/testing';
import { CodeGameController } from './code-game.controller';
import { CodeGameService } from './code-game.service';

describe('CodeGameController', () => {
  let controller: CodeGameController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CodeGameController],
      providers: [CodeGameService],
    }).compile();

    controller = module.get<CodeGameController>(CodeGameController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

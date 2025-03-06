import { Test, TestingModule } from '@nestjs/testing';
import { CodeGameService } from './code-game.service';

describe('CodeGameService', () => {
  let service: CodeGameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodeGameService],
    }).compile();

    service = module.get<CodeGameService>(CodeGameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

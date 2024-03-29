import { Test, TestingModule } from '@nestjs/testing';
import { UserConceptController } from './user-concept.controller';

describe('UserConceptController', () => {
  let controller: UserConceptController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserConceptController],
    }).compile();

    controller = module.get<UserConceptController>(UserConceptController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

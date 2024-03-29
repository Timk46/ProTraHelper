import { Test, TestingModule } from '@nestjs/testing';
import { UserConceptService } from './user-concept.service';

describe('UserConceptService', () => {
  let service: UserConceptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserConceptService],
    }).compile();

    service = module.get<UserConceptService>(UserConceptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

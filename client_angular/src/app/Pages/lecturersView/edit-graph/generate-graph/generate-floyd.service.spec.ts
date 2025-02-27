import { TestBed } from '@angular/core/testing';

import { GenerateFloydService } from './generate-floyd.service';

describe('GenerateFloydService', () => {
  let service: GenerateFloydService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GenerateFloydService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { GenerateTransitiveClosureService } from './generate-transitive-closure.service';

describe('GenerateTransitiveClosureService', () => {
  let service: GenerateTransitiveClosureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GenerateTransitiveClosureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

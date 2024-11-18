import { TestBed } from '@angular/core/testing';

import { GenerateExampleSolutionService } from './generate-example-solution.service';

describe('GenerateExampleSolutionService', () => {
  let service: GenerateExampleSolutionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GenerateExampleSolutionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

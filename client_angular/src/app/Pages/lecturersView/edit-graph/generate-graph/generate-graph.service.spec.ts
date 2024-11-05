import { TestBed } from '@angular/core/testing';

import { GenerateGraphService } from './generate-graph.service';

describe('GenerateGraphService', () => {
  let service: GenerateGraphService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GenerateGraphService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

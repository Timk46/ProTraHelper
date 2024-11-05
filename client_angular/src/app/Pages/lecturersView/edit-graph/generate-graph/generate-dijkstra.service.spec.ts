import { TestBed } from '@angular/core/testing';

import { GenerateDijkstraService } from './generate-dijkstra.service';

describe('GenerateDijkstraService', () => {
  let service: GenerateDijkstraService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GenerateDijkstraService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

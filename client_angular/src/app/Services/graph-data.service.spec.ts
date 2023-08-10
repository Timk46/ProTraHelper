import { TestBed } from '@angular/core/testing';

import { GraphDataService } from './graph-data.service';

describe('GraphService', () => {
  let service: GraphDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

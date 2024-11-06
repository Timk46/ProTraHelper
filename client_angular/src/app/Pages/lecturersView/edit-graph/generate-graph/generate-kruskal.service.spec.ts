import { TestBed } from '@angular/core/testing';

import { GenerateKruskalService } from './generate-kruskal.service';

describe('GenerateKruskalService', () => {
  let service: GenerateKruskalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GenerateKruskalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

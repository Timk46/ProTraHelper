import { TestBed } from '@angular/core/testing';

import { McqcreationService } from './mcqcreation.service';

describe('McqcreationService', () => {
  let service: McqcreationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(McqcreationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

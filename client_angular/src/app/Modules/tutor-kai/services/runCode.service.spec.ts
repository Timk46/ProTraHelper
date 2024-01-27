import { TestBed } from '@angular/core/testing';

import { RunCodeService } from './runCode.service';

describe('RunCodeService', () => {
  let service: RunCodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RunCodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

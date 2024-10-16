import { TestBed } from '@angular/core/testing';

import { FillInTaskService } from './fill-in-task.service';

describe('FillInTaskService', () => {
  let service: FillInTaskService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FillInTaskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

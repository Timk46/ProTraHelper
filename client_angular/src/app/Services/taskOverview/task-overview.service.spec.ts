import { TestBed } from '@angular/core/testing';

import { TaskOverviewService } from './task-overview.service';

describe('TaskOverviewService', () => {
  let service: TaskOverviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskOverviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

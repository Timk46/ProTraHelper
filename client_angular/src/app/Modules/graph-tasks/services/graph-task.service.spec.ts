import { TestBed } from '@angular/core/testing';

import { GraphTaskService } from './graph-task.service';

describe('GraphTaskService', () => {
  let service: GraphTaskService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphTaskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

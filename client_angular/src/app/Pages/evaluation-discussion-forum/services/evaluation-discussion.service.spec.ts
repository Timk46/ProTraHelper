import { TestBed } from '@angular/core/testing';

import { EvaluationDiscussionService } from './evaluation-discussion.service';

describe('EvaluationDiscussionService', () => {
  let service: EvaluationDiscussionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvaluationDiscussionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

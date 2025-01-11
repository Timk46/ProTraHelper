import { TestBed } from '@angular/core/testing';

import { AiFeedbackService } from './ai-feedback.service';

describe('AiFeedbackService', () => {
  let service: AiFeedbackService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiFeedbackService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

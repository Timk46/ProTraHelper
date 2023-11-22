import { TestBed } from '@angular/core/testing';

import { DiscussionViewService } from './discussion-view.service';

describe('DiscussionViewService', () => {
  let service: DiscussionViewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiscussionViewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

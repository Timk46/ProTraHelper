import { TestBed } from '@angular/core/testing';

import { DiscussionListService } from './discussion-list.service';

describe('DiscussionListService', () => {
  let service: DiscussionListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiscussionListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

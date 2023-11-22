import { TestBed } from '@angular/core/testing';

import { DiscussionVoteService } from './discussion-vote.service';

describe('DiscussionVoteService', () => {
  let service: DiscussionVoteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiscussionVoteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

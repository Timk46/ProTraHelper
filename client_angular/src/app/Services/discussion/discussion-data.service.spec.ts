import { TestBed } from '@angular/core/testing';

import { DiscussionDataService } from './discussion-data.service';

describe('DiscussionDataService', () => {
  let service: DiscussionDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiscussionDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

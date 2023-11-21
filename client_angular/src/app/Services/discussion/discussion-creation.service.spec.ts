import { TestBed } from '@angular/core/testing';

import { DiscussionCreationService } from './discussion-creation.service';

describe('CreationServiceService', () => {
  let service: DiscussionCreationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiscussionCreationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

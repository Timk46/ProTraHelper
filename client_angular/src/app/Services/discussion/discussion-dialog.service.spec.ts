import { TestBed } from '@angular/core/testing';

import { DiscussionDialogService } from './discussion-dialog.service';


describe('DiscussionDialogService', () => {
  let service: DiscussionDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiscussionDialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { ContentLinkerService } from './content-linker.service';

describe('ContentLinkerService', () => {
  let service: ContentLinkerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContentLinkerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

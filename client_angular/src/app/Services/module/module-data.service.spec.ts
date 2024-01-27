import { TestBed } from '@angular/core/testing';

import { ModuleDataService } from './module-data.service';

describe('ModuleDataService', () => {
  let service: ModuleDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModuleDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

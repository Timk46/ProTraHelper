import { TestBed } from '@angular/core/testing';

import { CodeGameTaskDataService } from './code-game-task-data.service';

describe('CodeGameTaskDataService', () => {
  let service: CodeGameTaskDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CodeGameTaskDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

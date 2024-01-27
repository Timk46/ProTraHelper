/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { TaskDataService } from './task-data.service';

describe('Service: TaskData', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TaskDataService]
    });
  });

  it('should ...', inject([TaskDataService], (service: TaskDataService) => {
    expect(service).toBeTruthy();
  }));
});

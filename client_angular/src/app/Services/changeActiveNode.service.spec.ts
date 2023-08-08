/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ChangeActiveNodeService } from './changeActiveNode.service';

describe('Service: ChangeActiveNode', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ChangeActiveNodeService]
    });
  });

  it('should ...', inject([ChangeActiveNodeService], (service: ChangeActiveNodeService) => {
    expect(service).toBeTruthy();
  }));
});

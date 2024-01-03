/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { GraphCommunicationService } from './graphCommunication.service';

describe('Service: ChangeActiveNode', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GraphCommunicationService]
    });
  });

  it('should ...', inject([GraphCommunicationService], (service: GraphCommunicationService) => {
    expect(service).toBeTruthy();
  }));
});

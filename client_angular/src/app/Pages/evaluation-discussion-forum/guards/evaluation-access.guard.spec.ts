import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { evaluationAccessGuard } from './evaluation-access.guard';

describe('evaluationAccessGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => evaluationAccessGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});

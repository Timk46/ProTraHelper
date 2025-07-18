import { CanActivateFn } from '@angular/router';

export const evaluationAccessGuard: CanActivateFn = (route, state) => {
  return true;
};

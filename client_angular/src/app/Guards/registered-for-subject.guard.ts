import { Injectable } from '@angular/core';
import type { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import type { Observable } from 'rxjs';
import type { UserService } from '../Services/auth/user.service';

@Injectable({
  providedIn: 'root',
})
export class RegisteredForSubjectGuard {
  constructor(
    private readonly userService: UserService,
    private readonly router: Router,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (this.userService.isRegisteredForSubject('Tragkonstruktion 3')) {
      // ToDo Make dynamic
      return true;
    } else {
      return this.router.createUrlTree(['/not-registered']);
    }
  }
}

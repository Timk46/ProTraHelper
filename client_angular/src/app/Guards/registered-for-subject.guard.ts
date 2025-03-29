import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '../Services/auth/user.service';

@Injectable({
  providedIn: 'root'
})
export class RegisteredForSubjectGuard  {
  constructor(private userService: UserService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    if (this.userService.isRegisteredForSubject('Objektorientierte und funktionale Programmierung')) { // ToDo Make dynamic
      return true;
    } else {
      return this.router.createUrlTree(['/not-registered']);
    }
  }
}

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../Services/auth/user.service';

/**
 * This guard checks if the user is logged in and redirects to the login page if not.
 */
@Injectable()
export class LoggedInGuard  {
  constructor(private userService: UserService , private router: Router) {
  }

  /**
   * Checks if the user is logged in and redirects to the login page if not.
   * @returns { Promise<boolean> } True if the user is logged in, false if not.
   */
  async canActivate(): Promise<boolean> {
    const isLoggedIn = this.userService.isUserLoggedIn();
    if (!isLoggedIn) {
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }
}

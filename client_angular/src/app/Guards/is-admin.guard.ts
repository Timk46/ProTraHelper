import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UserService } from '../Services/auth/user.service';

/**
 * This guard checks if the user is logged in and redirects to the login page if not.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private userService: UserService , private router: Router) {
  }

  /**
   * Checks if the user is logged in and redirects to the login page if not.
   * @returns { Promise<boolean> } True if the user is logged in, false if not.
   */
  async canActivate(): Promise<boolean> {
    const userRole = this.userService.getRole();
    if (userRole !== 'ADMIN') {
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }
}

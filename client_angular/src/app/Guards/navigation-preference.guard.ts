import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { NavigationPreferenceService } from '../Services/navigation/navigation-preference.service';

@Injectable({
  providedIn: 'root'
})
export class NavigationPreferenceGuard  {

  constructor(
    private navigationPreferenceService: NavigationPreferenceService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // If the user is trying to access /graph route
    if (state.url.includes('/graph')) {
      const preference = this.navigationPreferenceService.currentPreference;

      // If user prefers mobile navigation, redirect to mobile-navigator
      if (preference === 'mobile') {
        this.router.navigate(['/dashboard/mobile-navigator']);
        return false;
      }
    }

    return true;
  }
}

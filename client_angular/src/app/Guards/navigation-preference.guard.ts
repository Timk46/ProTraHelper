import { Injectable } from '@angular/core';
import type { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import type {
  NavigationPreferenceService,
  NavigationType,
} from '../Services/navigation/navigation-preference.service';

@Injectable({
  providedIn: 'root',
})
export class NavigationPreferenceGuard {
  constructor(
    private readonly navigationPreferenceService: NavigationPreferenceService,
    private readonly router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const preference = this.navigationPreferenceService.currentPreference;
    const url = state.url;

    const currentPath = url.includes('/graph')
      ? ('graph' as const)
      : url.includes('/mobile-navigator')
        ? ('mobile' as const)
        : url.includes('/highlight-navigator')
          ? ('highlight' as const)
          : null;

    if (currentPath && currentPath !== preference) {
      this.redirectBasedOnPreference(preference);
      return false;
    }

    return true;
  }

  private redirectBasedOnPreference(preference: NavigationType): void {
    const routes = {
      graph: '/dashboard/graph',
      mobile: '/dashboard/mobile-navigator',
      highlight: '/dashboard/highlight-navigator',
    } as const;
    this.router.navigate([routes[preference]]);
  }
}

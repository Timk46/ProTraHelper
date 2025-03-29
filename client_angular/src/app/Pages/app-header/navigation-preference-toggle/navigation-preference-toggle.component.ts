import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationPreferenceService, NavigationType } from 'src/app/Services/navigation/navigation-preference.service';

@Component({
  selector: 'app-navigation-preference-toggle',
  templateUrl: './navigation-preference-toggle.component.html',
  styleUrls: ['./navigation-preference-toggle.component.scss']
})
export class NavigationPreferenceToggleComponent implements OnInit {
  currentPreference: NavigationType = 'graph';

  constructor(
    private navigationPreferenceService: NavigationPreferenceService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentPreference = this.navigationPreferenceService.currentPreference;

    // Subscribe to changes in the navigation preference
    this.navigationPreferenceService.preference$.subscribe(preference => {
      this.currentPreference = preference;
    });
  }

  /**
   * Toggles between graph and mobile navigation
   */
  toggleNavigationPreference(): void {
    this.navigationPreferenceService.toggleNavigationPreference();

    // Redirect to the appropriate navigation component based on the new preference
    const currentUrl = this.router.url;

    // Only redirect if the user is currently on one of the navigation pages
    if (currentUrl.includes('/graph') || currentUrl.includes('/mobile-navigator')) {
      const navigationPath = this.currentPreference === 'graph'
        ? '/dashboard/mobile-navigator'
        : '/dashboard/graph';
      this.router.navigate([navigationPath]);
    }
  }

  /**
   * Get the tooltip text based on the current preference
   */
  get toggleTooltip(): string {
    return this.currentPreference === 'graph'
      ? 'Wechseln zur mobilen Navigation'
      : 'Wechseln zur Graph-Navigation';
  }

  /**
   * Get the toggle button label based on the current preference
   */
  get toggleLabel(): string {
    return this.currentPreference === 'graph'
      ? 'Graph-Navigation'
      : 'Mobile Navigation';
  }

  /**
   * Get the toggle icon based on the current preference
   */
  get toggleIcon(): string {
    return this.currentPreference === 'graph'
      ? 'view_list' // Material icon for mobile view
      : 'account_tree'; // Material icon for graph view
  }
}

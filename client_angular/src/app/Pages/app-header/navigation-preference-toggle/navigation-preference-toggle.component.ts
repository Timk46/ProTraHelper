import { OnInit, Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import {
  NavigationPreferenceService,
  NavigationType,
} from 'src/app/Services/navigation/navigation-preference.service';
import { NavigationPreferenceSettingsComponent } from '../navigation-preference-settings/navigation-preference-settings.component';
import { UserService } from 'src/app/Services/auth/user.service';
import { ModuleDataService } from '../../../Services/module/module-data.service';

@Component({
  selector: 'app-navigation-preference-toggle',
  templateUrl: './navigation-preference-toggle.component.html',
  styleUrls: ['./navigation-preference-toggle.component.scss'],
})
export class NavigationPreferenceToggleComponent implements OnInit {
  currentPreference: NavigationType = 'graph';
  isEditMode = false;

  constructor(
    private readonly dialog: MatDialog,
    private readonly navigationPreferenceService: NavigationPreferenceService,
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly moduleDataService: ModuleDataService,
  ) {}

  ngOnInit(): void {
    this.currentPreference = this.navigationPreferenceService.currentPreference;

    // Subscribe to changes in the navigation preference
    this.navigationPreferenceService.preference$.subscribe(preference => {
      this.currentPreference = preference;
    });

    // Subscribe to edit mode changes
    this.userService.hasEditModeActive$.subscribe(isEdit => {
      this.isEditMode = isEdit;

      // Reload enabled navigation types when edit mode changes
      // Using module ID 1 as default
      this.navigationPreferenceService.loadEnabledNavigationTypes(1).subscribe();
    });
  }

  /**
   * Toggles between navigation types and updates the current route
   */
  toggleNavigationPreference(): void {
    this.navigationPreferenceService.toggleNavigationPreference();

    // Redirect to the appropriate navigation component based on the new preference
    const currentUrl = this.router.url;

    // Only redirect if the user is currently on one of the navigation pages
    if (
      currentUrl.includes('/graph') ||
      currentUrl.includes('/mobile-navigator') ||
      currentUrl.includes('/highlight-navigator')
    ) {
      const newPreference = this.navigationPreferenceService.currentPreference;
      const routes = {
        graph: '/dashboard/graph',
        mobile: '/dashboard/mobile-navigator',
        highlight: '/dashboard/highlight-navigator',
      };
      this.router.navigate([routes[newPreference]]);
    }
  }

  /**
   * Get the tooltip text based on the current preference
   */
  get toggleTooltip(): string {
    switch (this.currentPreference) {
      case 'graph':
        return 'Wechseln zur mobilen Navigation';
      case 'mobile':
        return 'Wechseln zur Highlight-Navigation';
      default:
        return 'Wechseln zur Graph-Navigation';
    }
  }

  /**
   * Get the toggle button label based on the current preference
   */
  get toggleLabel(): string {
    switch (this.currentPreference) {
      case 'graph':
        return 'Graph-Navigation';
      case 'mobile':
        return 'Mobile Navigation';
      default:
        return 'Highlight Navigation';
    }
  }

  /**
   * Get the toggle icon based on the current preference
   */
  get toggleIcon(): string {
    switch (this.currentPreference) {
      case 'graph':
        return 'view_list'; // Material icon for mobile view
      case 'mobile':
        return 'stars'; // Material icon for highlight view
      default:
        return 'account_tree'; // Material icon for graph view
    }
  }

  /**
   * Opens the settings dialog for navigation preferences
   */
  openSettings(): void {
    this.moduleDataService.getCurrentModule().subscribe(module => {
      const dialogRef = this.dialog.open(NavigationPreferenceSettingsComponent, {
        width: '400px',
        data: { moduleId: module.id },
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Refresh available navigation types
          this.navigationPreferenceService.loadEnabledNavigationTypes(module.id).subscribe();
        }
      });
    });
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from 'src/app/Services/auth/user.service';
import { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';
import { NavigationPreferenceService, NavigationType } from 'src/app/Services/navigation/navigation-preference.service';
import { NotificationService } from 'src/app/Services/notification/notification.service';
import { ToolbarService } from 'src/app/Services/toolbar/toolbar.service';
import { HelperAppOnboardingService } from 'src/app/Services/helper-app-onboarding/helper-app-onboarding.service';
import { HelperAppOnboardingComponent } from 'src/app/features/helper-app-onboarding/helper-app-onboarding.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  unreadCount: number = 0;
  private subscriptions: Subscription[] = [];

  currentNavigationPreference: NavigationType = 'graph';
  isLandscapeView = false;

  constructor(
    public toolbarService: ToolbarService,
    public sSS: ScreenSizeService,
    private title: Title,
    private notificationService: NotificationService,
    private navigationPreferenceService: NavigationPreferenceService,
    private dialog: MatDialog,
    private helperAppOnboardingService: HelperAppOnboardingService
  ) {
    toolbarService.show();
    title.setTitle('GOALS: Dashboard');
    sSS.isHandset.subscribe((result) => {
      console.log('HANDSET', result);
    });
    sSS.isWeb.subscribe((result) => {
      console.log('WEB', result);
    });
  }

  get isMobile() {
    return window.innerWidth < 768;
  }

  ngOnInit() {
    console.log('🔍 [Dashboard] ngOnInit() - Component initializing...');

    // Ensure WebSocket connection is established
    this.notificationService.initializeWebSocket();

    this.subscriptions.push(
      this.notificationService.getUnreadCount().subscribe(count => {
        this.unreadCount = count;
      }),
      this.notificationService.getNotifications().subscribe(),
      this.navigationPreferenceService.preference$.subscribe(preference => {
        this.currentNavigationPreference = preference;
      }),
      this.sSS.isLandscape.subscribe(isLandscape => {
        this.isLandscapeView = isLandscape;
      })
    );

    // Check if helper app onboarding should be shown for architecture students
    console.log('🔍 [Dashboard] About to call checkHelperAppOnboarding()...');
    this.checkHelperAppOnboarding();
  }

  /**
   * Prüft ob das Helper-App Onboarding für User mit Rolle ARCHSTUDENT angezeigt werden soll
   */
  private checkHelperAppOnboarding(): void {
    console.log('🔍 [Dashboard] checkHelperAppOnboarding() - Starting onboarding check...');

    // Delay um sicherzustellen, dass alle anderen Services initialisiert sind
    setTimeout(() => {
      console.log('🔍 [Dashboard] Timeout completed, calling shouldShowOnboarding()...');

      const shouldShow = this.helperAppOnboardingService.shouldShowOnboarding();
      console.log('🔍 [Dashboard] shouldShowOnboarding() returned:', shouldShow);

      if (shouldShow) {
        console.log('✅ [Dashboard] Showing Helper App Onboarding dialog...');
        this.showHelperAppOnboarding();
      } else {
        console.log('❌ [Dashboard] Helper App Onboarding will NOT be shown');
      }
    }, 1000);
  }

  /**
   * Öffnet den Helper-App Onboarding Dialog
   */
  private showHelperAppOnboarding(): void {
    console.log('🔍 [Dashboard] showHelperAppOnboarding() - Opening dialog...');

    const dialogRef = this.dialog.open(HelperAppOnboardingComponent, {
      width: '90vw',
      maxWidth: '600px',
      height: 'auto',
      maxHeight: '90vh',
      disableClose: true,
      hasBackdrop: true,
      panelClass: 'helper-app-onboarding-dialog'
    });

    console.log('✅ [Dashboard] Helper App Onboarding dialog opened successfully');

    // Optional: React auf Dialog-Close
    dialogRef.afterClosed().subscribe(result => {
      console.log('🔍 [Dashboard] Helper App Onboarding dialog closed:', result);
    });
  }

  /**
   * Determines whether to show the graph or mobile navigator based on:
   * 1. User preference (if explicitly set)
   * 2. Device orientation (landscape = graph, portrait = mobile) as fallback
   */
  shouldShowGraph(): boolean {
    // First check user preference
    if (this.currentNavigationPreference === 'graph') {
      return true;
    } else if (this.currentNavigationPreference === 'mobile') {
      return false;
    }

    // Fallback to screen orientation if no specific preference
    return this.isLandscapeView;
  }

  ngOnDestroy() {
    console.log('🔍 [Dashboard] Component destroying...');
    // Unsubscribe from all subscriptions to avoid memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}

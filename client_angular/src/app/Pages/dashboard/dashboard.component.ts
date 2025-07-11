import type { OnDestroy, OnInit } from '@angular/core';
import { Component } from '@angular/core';
import type { Title } from '@angular/platform-browser';
import type { Subscription } from 'rxjs';
import type { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';
import type {
  NavigationPreferenceService,
  NavigationType,
} from 'src/app/Services/navigation/navigation-preference.service';
import type { NotificationService } from 'src/app/Services/notification/notification.service';
import type { ToolbarService } from 'src/app/Services/toolbar/toolbar.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  unreadCount: number = 0;
  private readonly subscriptions: Subscription[] = [];

  currentNavigationPreference: NavigationType = 'graph';
  isLandscapeView = false;

  constructor(
    public toolbarService: ToolbarService,
    public sSS: ScreenSizeService,
    private readonly title: Title,
    private readonly notificationService: NotificationService,
    private readonly navigationPreferenceService: NavigationPreferenceService,
  ) {
    toolbarService.show();
    this.title.setTitle('GOALS: Dashboard');
    sSS.isHandset.subscribe(result => {
      console.log('HANDSET', result);
    });
    sSS.isWeb.subscribe(result => {
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
      }),
    );
  }

  /**
   * Returns which navigator to show based on the current preference
   */
  get currentNavigator(): 'graph' | 'mobile' | 'highlight' {
    return this.currentNavigationPreference;
  }

  ngOnDestroy() {
    console.log('🔍 [Dashboard] Component destroying...');
    // Unsubscribe from all subscriptions to avoid memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}

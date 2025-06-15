import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { UserService } from 'src/app/Services/auth/user.service';
import { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';
import { NavigationPreferenceService, NavigationType } from 'src/app/Services/navigation/navigation-preference.service';
import { NotificationService } from 'src/app/Services/notification/notification.service';
import { ToolbarService } from 'src/app/Services/toolbar/toolbar.service';

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
    private navigationPreferenceService: NavigationPreferenceService
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
  }

  /**
   * Returns which navigator to show based on the current preference
   */
  get currentNavigator(): 'graph' | 'mobile' | 'highlight' {
    return this.currentNavigationPreference;
  }
  ngOnDestroy() {
    // Unsubscribe from all subscriptions to avoid memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}

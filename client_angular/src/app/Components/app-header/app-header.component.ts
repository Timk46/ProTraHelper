import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ConfirmationBoxComponent } from 'src/app/Pages/confirmation-box/confirmation-box.component';
import { UserService } from 'src/app/Services/auth/user.service';
import { NavigationPreferenceService } from 'src/app/Services/navigation/navigation-preference.service';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss']
})
export class AppHeaderComponent implements OnInit {
  userMail: string = "";
  userRole: string = "";
  userIsLoggedIn: boolean = false;
  showNavToggle: boolean = true;

  /**
   * Navigiert zum Dashboard
   */
  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  constructor(
    private userService: UserService,
    private router: Router,
    public dialog: MatDialog,
    private navigationPreferenceService: NavigationPreferenceService
  ) {
    // Subscribe to the authentication observable
    this.userService.isAuthenticated$.subscribe((isAuthenticated) => {
      this.userIsLoggedIn = isAuthenticated;
      if (isAuthenticated) {
        this.userMail = userService.getEmail();
        this.userRole = userService.getRole();
      }
    });
  }

  ngOnInit(): void {
    // Prüfe, ob wir auf einer Route sind, die den Navigation Toggle anzeigen soll
    this.router.events.subscribe(() => {
      const currentUrl = this.router.url;
      // Hier könnte man die Anzeige basierend auf der Route steuern
      this.showNavToggle = !currentUrl.includes('/login');
    });
  }


  logOut(logOutAllUserDevices: boolean): void {
    if (logOutAllUserDevices) {
      const dialog = this.dialog.open(ConfirmationBoxComponent, {
        data: {
          title: 'Abmeldung bestätigen',
          message: 'Möchten Sie sich wirklich von allen Geräten abmelden?',
          decline: 'Abbrechen',
          accept: 'Abmelden',
          swapButtons: false,
          swapColors: true
        }
      });

      dialog.afterClosed().subscribe((result) => {
        if (result) {
          this.userService.logout(true).then(() => {
            this.userIsLoggedIn = false;

            // Open CAS logout URL in a new tab
            window.open('https://cas.zimt.uni-siegen.de/cas/logout', '_blank');

            // Navigate to the login page in the current tab
            this.router.navigate(['/login']);
          });
        }
      });
    } else {
      this.userService.logout(false).then(() => {
        this.userIsLoggedIn = false;

        // Open CAS logout URL in a new tab
        window.open('https://cas.zimt.uni-siegen.de/cas/logout', '_blank');

        // Navigate to the login page in the current tab
        this.router.navigate(['/login']);
      });
    }
  }
}

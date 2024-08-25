import { UserService } from './Services/auth/user.service';
import { ToolbarService } from './Services/toolbar/toolbar.service';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { version } from '@DTOs/version';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  userMail: string = "";
  userRole: string = "";
  version: string = "";
  userIsLoggedIn: boolean = false;
  constructor
    (
      private userService: UserService,
      private router: Router,
      public dialog: MatDialog,
      public toolbarService: ToolbarService,
    )
    {
      this.version = version; // Client Version Number
      // Subscribe to the authentication observable
      this.userService.isAuthenticated$.subscribe((isAuthenticated) => {
        this.userIsLoggedIn = isAuthenticated;
        if (isAuthenticated)
        {
          this.userMail= userService.getEmail();
          this.userRole = userService.getRole();
        }
      });
    }

  openContact() {
    const dialogRef = this.dialog.open(ContactComponent);
    dialogRef.afterClosed().subscribe(result => {
    });
  }

  openDatenschutz() {
    const dialogRef = this.dialog.open(DatenschutzComponent);
    dialogRef.afterClosed().subscribe(result => {
    });
  }

  openImpressum() {
    const dialogRef = this.dialog.open(ImpressumComponent);
    dialogRef.afterClosed().subscribe(result => {
    });
  }


  showProgress() {
    this.userService.getUserTotalProgress().subscribe(data => {
      const userTotalProgress = data;
      const dialogRef = this.dialog.open(ProgressComponent);
      dialogRef.componentInstance.userTotalProgress = userTotalProgress;
      dialogRef.afterClosed().subscribe(result => {
      });
    });
    //console.log("User Total Progress: " + userTotalProgress);
  }


  ngOnInit() {
    //this.toolbarService.show();
  }

  logOut() {
    this.userIsLoggedIn = false;
    this.userService.removeTokens();
    this.router.navigate(['/login']);
  }

}

@Component({
  selector: 'impressum',
  templateUrl: './about/impressum.html',
})
export class ImpressumComponent {}

@Component({
  selector: 'datenschutz',
  templateUrl: './about/datenschutz.html',
})

export class DatenschutzComponent {}

@Component({
  selector: 'contact',
  templateUrl: './about/contact.html',
})

export class ContactComponent {}

@Component({
  selector: 'progressInfo',
  templateUrl: './about/progress.html',
})

export class ProgressComponent {
  userTotalProgress: number = -1;
}

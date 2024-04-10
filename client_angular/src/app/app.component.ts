import { UserService } from './Services/auth/user.service';
import { ToolbarService } from './Services/toolbar/toolbar.service';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { globalRole } from '@DTOs/roles.enum';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  userMail: string = "";
  userRole: string = "";
  userIsLoggedIn: boolean = false;
  constructor
    (
      private userService: UserService,
      private router: Router,
      public dialog: MatDialog,
      public toolbarService: ToolbarService
    )
    {
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


  ngOnInit() {
    //this.toolbarService.show();
  }

  logOut() {
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

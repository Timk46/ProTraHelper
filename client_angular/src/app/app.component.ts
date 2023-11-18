import { UserService } from './Services/auth/user.service';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  userMail: string = "";
  userIsLoggedIn: boolean = false;
  constructor
    (
      private userService: UserService,
      private router: Router
    )
    {
      // Subscribe to the authentication observable
      this.userService.isAuthenticated$.subscribe((isAuthenticated) => {
        this.userIsLoggedIn = isAuthenticated;
        this.userMail= userService.getEmail();
      });
    }

  ngOnInit() {

  }

  logOut() {
    this.userService.removeTokens();
    this.router.navigate(['/login']);
  }

}

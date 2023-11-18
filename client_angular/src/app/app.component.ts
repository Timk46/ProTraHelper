import { UserService } from './Services/auth/user.service';
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  userMail: string;
  constructor(
    UserService: UserService)
    {
      this.userMail= UserService.getEmail();
    }

  ngOnInit() {

  }

}

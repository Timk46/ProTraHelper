import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';
import type { ActivatedRoute, Router } from '@angular/router';
import type { UserService } from '../../Services/auth/user.service';
import type { FormBuilder, FormGroup } from '@angular/forms';
import { Validators } from '@angular/forms';
import type { Title } from '@angular/platform-browser';

/**
 * The LoginComponent handles the login process.
 * It checks for access token and then navigates to the '/code' page.
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly formBuilder: FormBuilder,
    private readonly title: Title,
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  loginForm: FormGroup;
  isLoggedIn: boolean = false;

  browserName = '';
  isChrome = false;

  /**
   * It checks for accessToken and refreshToken in the queryParams and uses them to set tokens in the UserService.
   * This is needed because the authentication server (CAS) redirects to the client with the tokens as query parameters.
   * If both tokens are present, it then navigates to the '/dashboard' page.
   */
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const accessToken = params['accessToken'];
      const refreshToken = params['refreshToken'];

      if (accessToken && refreshToken) {
        this.userService.setTokens(accessToken, refreshToken);
        this.router.navigate(['/dashboard']);
      }
    });
    this.title.setTitle('GOALS: Login');

    this.browserName = this.getBrowserName();
    this.isChrome = this.browserName === 'Chrome';
  }

  getBrowserName() {
    const agent = window.navigator.userAgent.toLowerCase();
    console.log(agent);
    switch (true) {
      case agent.indexOf('edge') > -1:
        return 'Edge';
      case agent.indexOf('opr') > -1 && !!(<any>window).opr:
        return 'Opera';
      case agent.indexOf('chrome') > -1 && !!(<any>window).chrome:
        return 'Chrome';
      case agent.indexOf('trident') > -1:
        return 'Internet Explorer';
      case agent.indexOf('firefox') > -1:
        return 'Firefox';
      case agent.indexOf('safari') > -1:
        return 'Safari';
      default:
        return 'other';
    }
  }

  /**
   * The login method navigates to the authentication server to authenticate the user.
   * The device id is passed as a query parameter to the server. This is to save the
   * refresh token in the database with the device id.
   */
  loginWithCAS(): void {
    const deviceId = this.userService.getDeviceId();
    window.location.href = `${environment.server}/auth/cas/?device-id=${deviceId}`;
  }

  loginWithPassword() {
    if (this.loginForm.invalid) {
      Object.values(this.loginForm.controls).forEach(control => {
        control.markAsTouched();
      });
      console.error('Form is invalid');
      return;
    }

    const { username, password } = this.loginForm.value;
    this.userService.login(username, password);
  }
}

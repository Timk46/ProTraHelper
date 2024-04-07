import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../Services/auth/user.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';

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
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private formBuilder: FormBuilder,
    private title: Title
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  loginForm: FormGroup;
  isLoggedIn: boolean = false;

  /**
   * It checks for accessToken in the queryParams and uses them to set tokens in the UserService.
   * This is needed because the authentication server (CAS) redirects to the client with the tokens as query parameters.
   * If both tokens are present, it then navigates to the '/dashboard' page.
   */
  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const accessToken = params['accessToken'];

      if (accessToken) {
        this.userService.setTokens(accessToken);
        this.router.navigate(['/dashboard']);
      }
    });
    this.title.setTitle('GOALS: Login');
  }

  /**
   * The login method navigates to the authentication server to authenticate the user.
   */
  loginWithCAS(): void {
    window.location.href = `${environment.server}/auth/cas/`;
  }

  loginWithPassword(){
    if (this.loginForm.invalid) {
      Object.values(this.loginForm.controls).forEach(control => {
        control.markAsTouched();
      });
      console.error("Form is invalid");
      return;
    }

    const { username, password } = this.loginForm.value;
    this.userService.login(username, password);
  }
}

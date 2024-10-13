import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import jwt_decode from 'jwt-decode';
import { globalRole } from '@DTOs/roles.enum';
import { environment } from 'src/environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  isAuthenticated$: Observable<boolean>;
  hasEditModeActive$: Observable<boolean>;

  constructor
  (
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient,
  )
  {
    this.isAuthenticated$ = new BehaviorSubject<boolean>(false);
    this.hasEditModeActive$ = new BehaviorSubject<boolean>(false);
  }

  /**
   * This method is used to handle the login
   * @param username the username (email)
   * @param password the password
   * @returns { Promise<boolean> } a promise containing a boolean indicating whether the login was successful
   */
  login(username: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const credentials = { email: username, password: password };
      console.log('Attempting login with:', { email: username, password: '******' });
      console.log('Server URL:', environment.server + '/auth/login');

      this.http.post(environment.server + '/auth/login', credentials).subscribe({
        next: (response: any) => {
          console.log('Login successful:', response);
          const accessToken = response.accessToken;
          localStorage.setItem('accessToken', accessToken);
          this.openSnackBar("Hallo " + username);
          this.router.navigate(['/dashboard']);
          resolve(true);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Login error:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          if (error.error instanceof ErrorEvent) {
            console.error('Client-side error:', error.error.message);
          } else {
            console.error('Server-side error:', error.error);
          }
          this.openSnackBar("Der Login ist fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.");
          resolve(false);
        }
      });
    });
  }

  /**
   * Checks if the user is logged in by verifying the existence of authentication tokens.
   * - `accessToken`: Gets from local storage
   *
   * @returns A boolean value representing whether the user is logged in
   */
  isUserLoggedIn(): boolean {
    const isAuthenticated = Boolean(
      localStorage.getItem('accessToken')
    );
    (this.isAuthenticated$ as BehaviorSubject<boolean>).next(isAuthenticated);
    return isAuthenticated;
  }

  /**
   * Sets the authentication accessToken in local storage.
   *
   * @param accessToken - The user accessToken to be saved in local storage
   */
  setTokens(accessToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    (this.isAuthenticated$ as BehaviorSubject<boolean>).next(true);// Update authentication status
  }

  /**
   * Removes both accessToken from local storage,
   * if either of them exists.
   */
  removeTokens(): void {
    const accessToken = 'accessToken';

    if (localStorage.getItem(accessToken)) {
      localStorage.removeItem(accessToken);
      (this.isAuthenticated$ as BehaviorSubject<boolean>).next(false);// Update authentication status
    }
  }
  /**
   * This function gets the access token from the local storage.
   * @returns { string } The access token.
   */
  getAccessToken(): string {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      return accessToken;
    } else {
      throw new Error('No access token found');
    }
  }

  /**
   * This function decodes the access token and returns the decoded token.
   * @returns { any } The decoded access token.
   */
  decodeAccessToken(): any {
    const accessToken = this.getAccessToken();
    return jwt_decode(accessToken);
  }

  /**
   * This function gets the first name from the decoded access token.
   * @returns { string } The first name of the user.
   */
  getFirstName(): string {
    const decodedToken = this.decodeAccessToken();
    return decodedToken.firstName;
  }

  /**
   * This function gets the last name from the decoded access token.
   * @returns { string } The last name of the user.
   */
  getLastName(): string {
    const decodedToken = this.decodeAccessToken();
    return decodedToken.lastName;
  }

  /**
   * This function gets the email from the decoded access token.
   * @returns { string } The email of the user.
   */
  getEmail(): string {
    const decodedToken = this.decodeAccessToken();
    return decodedToken.email;
  }

  /**
   * This function gets the role from the decoded access token.
   * @returns { globalRole } The role of the user.
   */
  getRole(): globalRole  {
    const decodedToken = this.decodeAccessToken();
    return decodedToken.globalRole;
  }

  /**
   * This function gets the id from the decoded access token.
   * @returns { string } The id of the user.
   */
  getTokenID(): string {
    const decodedToken = this.decodeAccessToken();
    return decodedToken.id;
  }

  enableEditMode(): void {
    if (this.getRole() === globalRole.ADMIN) {
    (this.hasEditModeActive$ as BehaviorSubject<boolean>).next(true);
    }
  }
  disableEditMode(): void {
    (this.hasEditModeActive$ as BehaviorSubject<boolean>).next(false);
  }
   /**
   * Open a MatSnackBar with the provided message and icon.
   *
   * @param message - The message to display
   * @param icon - The icon to display
   */
   private openSnackBar(message: string): void {
    this.snackBar.open(message, '', {
      duration: 3000, // Time duration in milliseconds to display the snackbar
      panelClass: ['snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  /**
   * This function gets the total progress of the user.
   * @returns { Observable<number> } The total progress of the user.
   */
  getUserTotalProgress(): Observable<number> {
    return this.http.get<number>(environment.server + '/users/totalProgress');
  }
}

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import jwt_decode from 'jwt-decode';
import { globalRole } from '@DTOs/roles.enum';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  isAuthenticated$: Observable<boolean>;

  constructor() {
    this.isAuthenticated$ = new BehaviorSubject<boolean>(false);
  }

  /**
   * Checks if the user is logged in by verifying the existence of authentication tokens.
   * - `accessToken`: Gets from local storage
   * - `refreshToken`: Gets from local storage
   *
   * @returns A boolean value representing whether the user is logged in
   */
  isUserLoggedIn(): boolean {
    const isAuthenticated = Boolean(
      localStorage.getItem('accessToken') &&
        localStorage.getItem('refreshToken')
    );
    (this.isAuthenticated$ as BehaviorSubject<boolean>).next(isAuthenticated);
    return isAuthenticated;
  }

  /**
   * Sets the authentication accessToken and refreshToken in local storage.
   *
   * @param accessToken - The user accessToken to be saved in local storage
   * @param refreshToken - The refreshToken  to be saved in local storage
   */
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Removes both accessToken and refreshToken from local storage,
   * if either of them exists.
   */
  removeTokens(): void {
    const accessToken = 'accessToken';
    const refreshToken = 'refreshToken';

    if (localStorage.getItem(accessToken)) {
      localStorage.removeItem(accessToken);
      localStorage.removeItem(refreshToken);
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
    return decodedToken.role;
  }

  /**
   * This function gets the id from the decoded access token.
   * @returns { string } The id of the user.
   */
  getTokenID(): string {
    const decodedToken = this.decodeAccessToken();
    return decodedToken.id;
  }
}

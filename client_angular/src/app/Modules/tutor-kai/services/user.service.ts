import { Injectable } from '@angular/core';

/**
 * A service that is responsible for handling user authentication tokens.
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor() {}

  /**
   * Checks if the user is logged in by verifying the existence of authentication tokens.
   * - `accessToken`: Gets from local storage
   * - `refreshToken`: Gets from local storage
   *
   * @returns A boolean value representing whether the user is logged in
   */
  isUserLoggedIn(): boolean {
    return Boolean(localStorage.getItem('accessToken') && localStorage.getItem('refreshToken'));
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
}

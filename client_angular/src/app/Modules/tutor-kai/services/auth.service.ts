import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, tap } from 'rxjs/operators';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from 'src/environments/environment';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
/**
 * This class is used to define the authentication service
 */
export class AuthService {

  constructor(private http: HttpClient, private toastr: ToastrService, private router: Router) { }

  /**
   * This method is used to get the access token from local storage
   * @returns { string | null } the access token
   */
  getAccessToken(): string | null {
    // Retrieve the access token from local storage
    return localStorage.getItem('accessToken');
  }

  /**
   * This method is used to get the refresh token from local storage
   * @returns { string | null } the refresh token
   */
  getRefreshToken(): string | null {
    // Retrieve the refresh token from local storage
    return localStorage.getItem('refreshToken');
  }


  /**
   * This method is used to handle the login
   * @param username the username (email)
   * @param password the password
   * @returns { Promise<boolean> } a promise containing a boolean indicating whether the login was successful
   */
  login(username: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const credentials = { username: username, password: password };
      this.http.post(environment.server + '/auth/login', credentials).subscribe(
        {
          next: (response: any) => {
            // Handle successful login
            const accessToken = response.accessToken;
            const refreshToken = response.refreshToken;
            // Store the access token and refresh token in local storage
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            // console.log("Logged in as " + username);
            this.toastr.success("Hallo " + username);
            this.router.navigate(['/code']);
            resolve(true);
          },
          error: (error: any) => {
            // Handle login error
            console.error(error);
            this.toastr.error("Der Login ist fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.");
            resolve(false);
          }
        });
    });
  }

  /**
   * This method is used to handle the logout
   * @returns { Promise<boolean> } a promise that resolves to true if logout is successful, false otherwise
   */
  logout(): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      if (!this.getAccessToken() || !this.getRefreshToken()) {
        // Already logged out
        // console.log('No access token or refresh token found. Already logged out');
        this.clearLocalStorage();
        resolve(false); // Resolve the promise as failed
        return;
      }

      const isTokenValid = await this.checkTokenValidity();
      if (!isTokenValid) {
        // Already logged out
        // console.log('Token is not valid. Already logged out');
        this.clearLocalStorage();
        resolve(false); // Resolve the promise as failed
        return;
      }

      this.http.get(environment.server + '/auth/logout').pipe(
        // Clear the access token and refresh token from local storage or cookie
        finalize(() => {
          this.clearLocalStorage();
          this.router.navigate(['/login']);
        })
      ).subscribe({
        next: (response: any) => {
          // console.log(response);
          if (response.message === 'Logout successful') {
            this.toastr.success('Sie sind ausgeloggt');
            resolve(true); // Resolve the promise as successful
          } else {
            this.toastr.warning('Already logged out');
            resolve(false); // Resolve the promise as failed
          }
        },
        error: (error: any) => {
          console.error(error);
          this.toastr.warning('Already logged out');
          resolve(false); // Resolve the promise as failed
        },
        complete: () => { }
      });
    });
  }

  /**
   * This method is used to check if the access token is valid ("am I logged in?")
   * @returns { Promise<boolean> } a promise that resolves to true if the token is valid, false otherwise
   */
  checkTokenValidity(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!this.getAccessToken() || !this.getRefreshToken()) {
        // Already logged out
        // console.log('Already logged out');
        resolve(false); // Resolve the promise as failed
        return;
      }

      this.http.get(environment.server + '/auth/check').subscribe({
        next: (response: any) => {
          // console.log(response);
          if (response.isValid === true) {
            resolve(true); // Resolve the promise as successful
          } else if (response.isValid === false) {
            resolve(false); // Resolve the promise as failed
          }
        },
        error: (error: any) => {
          // this is not an error, the token is just not valid
          resolve(false); // Resolve the promise as failed
        },
        complete: () => { }
      });
    });
  }

  /**
   * This method deletes the access and refresh tokens from local storage
   */
  clearLocalStorage(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }


}

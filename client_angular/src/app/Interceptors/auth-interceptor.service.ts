import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../Services/auth/user.service';

/**
 * The AuthInterceptor class intercepts Http requests and
 * adds an "Authorization" header with the current access token.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly userService: UserService,
  ) {}

  /**
   * Intercepts HTTP requests to add authentication headers and handle errors.
   *
   * @param request - The outgoing HTTP request.
   * @param next - The next interceptor in the chain.
   * @returns An observable of the HTTP event.
   */
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Exclude Helper-App requests from all authentication processing
    if (
      request.url.includes('localhost:3001') ||
      request.url.includes('127.0.0.1:3001') ||
      // TODO SUPER UNSICHER !
      request.headers.has('Skip-Auth-Interceptor')
    ) {
      console.log('AuthInterceptor: Skipping Helper-App request:', request.url);
      return next.handle(request);
    }

    const accessToken = localStorage.getItem('accessToken');
    const deviceId = this.userService.getDeviceId();

    // Add the device ID to the request
    if (deviceId) {
      request = request.clone({
        setHeaders: {
          'device-id': deviceId,  // Use lowercase to match browser CORS behavior
        },
      });
    }

    // Exclude the refresh-token request from interception, after the device ID is added
    if (request.url.includes('/auth/refresh')) {
      return next.handle(request);
    }

    // Add the access token to the request
    if (accessToken) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }

    // send cloned request with header to the next handler.
    return next.handle(request).pipe(
      catchError((err: HttpErrorResponse) => {
        this.checkError(err);

        if (err.status === 403 || err.status === 498) {
          this.userService.removeTokens();
          this.router.navigate(['/login']);
        }

        if (err.status === 401) {
          // Access token expired, try refreshing
          console.log('Access token expired, trying to refresh...');

          const refreshToken = this.userService.getRefreshToken();
          if (!refreshToken) {
            // Refresh token is expired or not available
            // redirect to login page
            this.router.navigate(['/login']);
            return throwError(() => new Error('Unauthorized'));
          }

          return this.userService.refreshTokens(refreshToken).pipe(
            switchMap(() => {
              // Retry the original request with the new access token
              console.log('Access token refreshed successfully, retrying original request...');
              request = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${this.userService.getAccessToken()}`,
                  'Device-ID': deviceId,
                },
              });
              return next.handle(request);
            }),
            catchError((error: any) => {
              // Refresh token is invalid or expired
              this.openSnackBar('Sitzung abgelaufen. Bitte erneut anmelden', 'Warning');
              this.userService.removeTokens();

              this.router.navigate(['/login']);
              return throwError(() => new Error('Unauthorized'));
            }),
          );
        } else {
          return throwError(() => err);
        }

        return throwError(err);
      }),
    );
  }

  /**
   * Checks the error status and handles it accordingly.
   *
   * @param error - The error object to be checked.
   */
  checkError(error: any) {
    if (error.status === 401) {
      return; // Unauthorized error is handled in the interceptor
    } else if (error.status === 429) {
      this.openSnackBar(
        'Too many requests in a short time. Please try again in a minute.',
        'Warning',
      );
    } else if (error.status === 403) {
      this.openSnackBar('Authorization failed.', 'Warning');
    } else {
      this.openSnackBar(
        `An error occurred. Please check the console.\n${error.statusText}`,
        'Warning',
      );
    }
  }

  /**
   * Open a MatSnackBar with the provided message and icon.
   *
   * @param message - The message to display
   * @param icon - The icon to display
   */
  private openSnackBar(message: string, icon: string): void {
    this.snackBar.open(message, '', {
      duration: 3000, // Time duration in milliseconds to display the snackbar
      panelClass: ['snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}

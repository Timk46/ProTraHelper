import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../Services/auth/user.service';

/**
 * The AuthInterceptor class intercepts Http requests and
 * adds an "Authorization" header with the current access token.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private userService: UserService
  ) {}

  // Currently only using access token. Refresh token and device tokens not implemented yet.
  /**
   * Intercepts an HttpRequest and adds an "Authorization" header.
   *
   * @param req - The HttpRequest being intercepted
   * @param next - The HttpHandler to continue handling the request
   * @returns An Observable of the HttpEvent with a modified HttpRequest
   */
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const accessToken = localStorage.getItem('accessToken');

    // Clone the request and set the new header in one step.
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    });

    // send cloned request with header to the next handler.
    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        this.checkError(err);
        if (err.status === 401 || err.status === 403 || err.status === 498) {
          this.userService.removeTokens();
          this.router.navigate(['/login']);
        }
        return throwError(err);
      })
    );
  }

  /**
   * Check the error status and display an appropriate message via the snackBar.
   *
   * @param error - The error object
   */
  checkError(error: any) {
    if (error.status === 401) {
      this.openSnackBar('Please log in again.', 'Warning');
    } else if (error.status === 429) {
      this.openSnackBar(
        'Too many requests in a short time. Please try again in a minute.',
        'Warning'
      );
    }
    else if (error.status === 403) {
      this.openSnackBar(
        'Authorization failed.',
        'Warning'
      );
    }
    else {
      this.openSnackBar(
        `An error occurred. Please check the console.\n${error.statusText}`,
        'Warning'
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

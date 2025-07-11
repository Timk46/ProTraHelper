import { Injectable } from '@angular/core';
import type { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { HttpResponse } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { MatSnackBar } from '@angular/material/snack-bar';
import { version } from '@DTOs/version';

@Injectable()
export class VersionInterceptor implements HttpInterceptor {
  constructor(private readonly snackBar: MatSnackBar) {}
  snackBarIsActive: boolean = false;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          const serverVersion = event.headers.get('X-App-Version');
          if (serverVersion && serverVersion !== version) {
            if (!this.snackBarIsActive) {
              this.showReloadSnackbar();
              this.snackBarIsActive = true;
            }
          }
        }
      }),
    );
  }

  /**
   * Displays a snackbar with an option to reload the application for a new version.
   */
  showReloadSnackbar() {
    const snackBarRef = this.snackBar.open(
      'Eine neue Version der Anwendung ist verfügbar!',
      'Neu laden',
      {
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      },
    );

    snackBarRef.onAction().subscribe(() => {
      this.snackBarIsActive = false;
      this.forceReload();
    });
  }

  /**
   * Forces the browser to reload to the current page with a nocache parameter to avoid caching issues.
   */
  forceReload() {
    const currentUrl = window.location.href;
    const separator = currentUrl.includes('?') ? '&' : '?';
    const newUrl = `${currentUrl}${separator}nocache=${new Date().getTime()}`;
    window.location.href = newUrl;
  }
}

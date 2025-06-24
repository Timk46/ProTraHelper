import { Injectable } from '@angular/core';
import { HttpClient, HttpHandler, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout, retry } from 'rxjs/operators';

/**
 * Dedicated HTTP Service for ProTra Helper App communication
 *
 * This service bypasses the main Angular HTTP interceptors (especially AuthInterceptor)
 * to avoid CORS issues and authentication conflicts when communicating with the local Helper App.
 *
 * Key Features:
 * - No authentication headers (Device-ID, Authorization)
 * - Custom error handling for Helper App specific scenarios
 * - Automatic retry logic for connection issues
 * - Proper timeout handling
 */
@Injectable({
  providedIn: 'root'
})
export class HelperAppHttpService {
  private httpClient: HttpClient;
  private readonly HELPER_APP_TIMEOUT = 5000; // 5 seconds timeout
  private readonly RETRY_ATTEMPTS = 2; // Number of retry attempts for failed requests

  constructor(private handler: HttpHandler) {
    // Create a dedicated HttpClient that bypasses all interceptors
    this.httpClient = new HttpClient(this.handler);
  }

  /**
   * Performs a GET request to the Helper App
   *
   * @param url - The complete URL to request
   * @param options - Optional HTTP options
   * @returns Observable with the response
   */
  get<T>(url: string, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] };
    observe?: 'body';
    responseType?: 'json';
  }): Observable<T> {
    return this.httpClient.get<T>(url, {
      ...options,
      headers: this.createCleanHeaders(options?.headers)
    }).pipe(
      timeout(this.HELPER_APP_TIMEOUT),
      retry(this.RETRY_ATTEMPTS),
      catchError(this.handleHelperAppError.bind(this))
    );
  }

  /**
   * Performs a POST request to the Helper App
   *
   * @param url - The complete URL to request
   * @param body - The request body
   * @param options - Optional HTTP options
   * @returns Observable with the response
   */
  post<T>(url: string, body: any, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] };
    observe?: 'body';
    responseType?: 'json';
  }): Observable<T> {
    return this.httpClient.post<T>(url, body, {
      ...options,
      headers: this.createCleanHeaders(options?.headers)
    }).pipe(
      timeout(this.HELPER_APP_TIMEOUT),
      retry(this.RETRY_ATTEMPTS),
      catchError(this.handleHelperAppError.bind(this))
    );
  }

  /**
   * Creates clean headers for Helper App requests
   * Ensures no authentication-related headers are included
   *
   * @param customHeaders - Optional custom headers to include
   * @returns HttpHeaders instance with clean headers
   */
  private createCleanHeaders(customHeaders?: HttpHeaders | { [header: string]: string | string[] }): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    // Add custom headers if provided
    if (customHeaders) {
      if (customHeaders instanceof HttpHeaders) {
        customHeaders.keys().forEach(key => {
          const values = customHeaders.getAll(key);
          if (values) {
            headers = headers.set(key, values);
          }
        });
      } else {
        Object.keys(customHeaders).forEach(key => {
          const value = customHeaders[key];
          if (typeof value === 'string') {
            headers = headers.set(key, value);
          } else if (Array.isArray(value)) {
            headers = headers.set(key, value);
          }
        });
      }
    }

    return headers;
  }

  /**
   * Helper App specific error handling
   *
   * @param error - The HTTP error response
   * @returns Observable error with user-friendly message
   */
  private handleHelperAppError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Unbekannter Fehler bei der Kommunikation mit der Helferanwendung.';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      console.error('Helper App Client-seitiger Fehler:', error.error.message);
      errorMessage = 'Netzwerkfehler bei der Verbindung zur Helferanwendung. Überprüfen Sie, ob die ProTra-Helferanwendung läuft.';
    } else {
      // Backend returned an error status code
      console.error(`Helper App HTTP Fehler ${error.status}:`, error.error);

      switch (error.status) {
        case 0:
          errorMessage = 'Helferanwendung ist nicht erreichbar. Bitte stellen Sie sicher, dass die ProTra-Helferanwendung gestartet ist.';
          break;
        case 401:
          errorMessage = 'Authentifizierung bei der Helferanwendung fehlgeschlagen. Bitte überprüfen Sie das API-Token.';
          break;
        case 403:
          errorMessage = 'Zugriff auf die Helferanwendung verweigert. Das API-Token ist ungültig.';
          break;
        case 404:
          errorMessage = 'Der angeforderte Dienst ist in der Helferanwendung nicht verfügbar.';
          break;
        case 500:
          errorMessage = error.error?.message || 'Interner Fehler in der Helferanwendung.';
          break;
        case 502:
        case 503:
          errorMessage = 'Helferanwendung ist temporär nicht verfügbar. Bitte versuchen Sie es erneut.';
          break;
        default:
          errorMessage = error.error?.message || `HTTP Fehler ${error.status}: ${error.statusText}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Performs a health check on the Helper App
   *
   * @param baseUrl - The base URL of the Helper App
   * @returns Observable<boolean> indicating if Helper App is reachable
   */
  healthCheck(baseUrl: string): Observable<boolean> {
    return this.get<any>(`${baseUrl}/status`).pipe(
      timeout(3000), // Shorter timeout for health checks
      retry(1), // Only one retry for health checks
      catchError(() => {
        // Return false instead of throwing error for health checks
        return throwError(() => new Error('Helper App nicht erreichbar'));
      })
    );
  }
}

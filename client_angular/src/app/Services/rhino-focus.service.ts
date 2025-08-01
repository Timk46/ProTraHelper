/**
 * Rhino Focus Service
 * Verwaltet die Kommunikation mit dem Backend für Rhino-Fenster-Management
 * Stellt Angular-Services für Rhino-Fokussierung bereit
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, retry, timeout, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  RhinoWindowInfoDTO,
  RhinoFocusRequestDTO,
  RhinoFocusResponseDTO,
  RhinoWindowStatusDTO,
  WindowsApiAvailabilityDTO,
} from '@DTOs/index';

/**
 * Konfiguration für Rhino Focus Service
 */
interface RhinoFocusConfig {
  enabled: boolean;
  retryAttempts: number;
  timeoutMs: number;
  delayBeforeFocusMs: number;
  fallbackOnError: boolean;
}

/**
 * Standard-Konfiguration
 */
const DEFAULT_CONFIG: RhinoFocusConfig = {
  enabled: true,
  retryAttempts: 2,
  timeoutMs: 5000,
  delayBeforeFocusMs: 500,
  fallbackOnError: true,
};

@Injectable({
  providedIn: 'root',
})
export class RhinoFocusService {
  private readonly baseUrl = `${environment.server}/api/rhinodirect`;
  private config: RhinoFocusConfig = { ...DEFAULT_CONFIG };
  private isAvailable: boolean | null = null;

  constructor(private readonly http: HttpClient) {
    console.log('🎯 RhinoFocusService initialized');
    this.checkAvailability();
  }

  /**
   * Konfiguration aktualisieren
   * @param config - Neue Konfiguration
   */
  updateConfig(config: Partial<RhinoFocusConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ RhinoFocusService config updated:', this.config);
  }

  /**
   * Aktuelle Konfiguration abrufen
   * @returns Aktuelle Konfiguration
   */
  getConfig(): RhinoFocusConfig {
    return { ...this.config };
  }

  /**
   * Prüft die Verfügbarkeit der Windows API
   * @returns Observable mit Verfügbarkeitsstatus
   */
  checkAvailability(): Observable<boolean> {
    if (!this.config.enabled) {
      this.isAvailable = false;
      return of(false);
    }

    return this.http.get<WindowsApiAvailabilityDTO>(`${this.baseUrl}/test-windows-api`).pipe(
      timeout(this.config.timeoutMs),
      map(response => {
        this.isAvailable = response.available;
        console.log('🧪 Rhino API availability:', response);
        return response.available;
      }),
      catchError(error => {
        console.warn('⚠️ Rhino API availability check failed:', error);
        this.isAvailable = false;
        return of(false);
      }),
    );
  }

  /**
   * Fokussiert ein Rhino-Fenster
   * @param request - Fokussierungs-Anfrage
   * @returns Observable mit Fokussierungs-Ergebnis
   */
  focusRhinoWindow(request: RhinoFocusRequestDTO = {}): Observable<RhinoFocusResponseDTO> {
    console.log('is config enabled', this.config.enabled);
    console.log('is available', this.isAvailable);
    if (!this.config.enabled || this.isAvailable === false) {
      console.log('🚫 Rhino focus disabled or unavailable');
      return of({
        success: false,
        message: 'Rhino-Fokussierung nicht verfügbar',
        timestamp: new Date().toISOString(),
      });
    }

    // Standard-Werte setzen
    const focusRequest: RhinoFocusRequestDTO = {
      bringToFront: true,
      restoreIfMinimized: true,
      ...request,
    };

    console.log('🎯 Focusing Rhino window:', focusRequest);

    return this.http.post<RhinoFocusResponseDTO>(`${this.baseUrl}/focus-window`, focusRequest).pipe(
      timeout(this.config.timeoutMs),
      retry(this.config.retryAttempts),
      map((response: RhinoFocusResponseDTO) => {
        console.log('✅ Rhino focus result:', response);
        return response;
      }),
      catchError(error => this.handleError<RhinoFocusResponseDTO>('focusRhinoWindow', error)),
    );
  }

  /**
   * Fokussiert Rhino mit Verzögerung
   * @param request - Fokussierungs-Anfrage
   * @param delayMs - Verzögerung in Millisekunden (optional)
   * @returns Observable mit Fokussierungs-Ergebnis
   */
  focusRhinoWindowDelayed(
    request: RhinoFocusRequestDTO = {},
    delayMs?: number,
  ): Observable<RhinoFocusResponseDTO> {
    const delay = delayMs ?? this.config.delayBeforeFocusMs;

    return new Observable(observer => {
      setTimeout(() => {
        this.focusRhinoWindow(request).subscribe({
          next: result => observer.next(result),
          error: error => observer.error(error),
          complete: () => observer.complete(),
        });
      }, delay);
    });
  }

  /**
   * Ermittelt Rhino-Fenster-Informationen
   * @returns Observable mit Fenster-Informationen
   */
  getRhinoWindowInfo(): Observable<RhinoWindowInfoDTO[]> {
    if (!this.config.enabled || this.isAvailable === false) {
      console.log('🚫 Rhino window info disabled or unavailable');
      return of([]);
    }

    return this.http.get<RhinoWindowInfoDTO[]>(`${this.baseUrl}/window-info`).pipe(
      timeout(this.config.timeoutMs),
      retry(this.config.retryAttempts),
      map(windows => {
        console.log('🔍 Rhino windows found:', windows.length);
        return windows;
      }),
      catchError(error => this.handleError('getRhinoWindowInfo', error, [])),
    );
  }

  /**
   * Prüft den Status von Rhino-Fenstern
   * @returns Observable mit Fenster-Status
   */
  checkRhinoWindowStatus(): Observable<RhinoWindowStatusDTO> {
    if (!this.config.enabled || this.isAvailable === false) {
      console.log('🚫 Rhino window status disabled or unavailable');
      return of({
        isActive: false,
        totalWindows: 0,
      });
    }

    return this.http.get<RhinoWindowStatusDTO>(`${this.baseUrl}/window-status`).pipe(
      timeout(this.config.timeoutMs),
      retry(this.config.retryAttempts),
      map(status => {
        console.log('📊 Rhino window status:', status);
        return status;
      }),
      catchError(error =>
        this.handleError('checkRhinoWindowStatus', error, {
          isActive: false,
          totalWindows: 0,
        }),
      ),
    );
  }

  /**
   * Fokussiert das erste verfügbare Rhino-Fenster
   * @returns Observable mit Fokussierungs-Ergebnis
   */
  focusFirstAvailableWindow(): Observable<RhinoFocusResponseDTO> {
    return this.getRhinoWindowInfo().pipe(
      map(windows => {
        if (windows.length === 0) {
          return {
            success: false,
            message: 'Keine Rhino-Fenster gefunden',
            timestamp: new Date().toISOString(),
          };
        }

        // Fokussiere das erste Fenster
        const firstWindow = windows[0];
        return this.focusRhinoWindow({
          processId: firstWindow.processId,
          bringToFront: true,
          restoreIfMinimized: true,
        });
      }),
      // Flatten the nested Observable
      switchMap(result => {
        if (typeof result === 'object' && 'success' in result) {
          return of(result);
        }
        return result as Observable<RhinoFocusResponseDTO>;
      }),
    );
  }

  /**
   * Prüft ob Rhino verfügbar ist (synchron)
   * @returns Verfügbarkeitsstatus
   */
  isRhinoAvailable(): boolean {
    return this.config.enabled && this.isAvailable === true;
  }

  /**
   * Aktiviert/Deaktiviert den Service
   * @param enabled - Aktivierungsstatus
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`${enabled ? '✅' : '🚫'} RhinoFocusService ${enabled ? 'enabled' : 'disabled'}`);

    if (enabled && this.isAvailable === null) {
      this.checkAvailability().subscribe();
    }
  }

  /**
   * Fehlerbehandlung für HTTP-Requests
   * @param operation - Name der Operation
   * @param error - HTTP-Fehler
   * @param fallbackValue - Fallback-Wert bei Fehlern
   * @returns Observable mit Fallback-Wert oder Fehler
   */
  private handleError<T>(
    operation: string,
    error: HttpErrorResponse,
    fallbackValue?: T,
  ): Observable<T> {
    console.error(`❌ ${operation} failed:`, error);

    // Bei Netzwerkfehlern oder Server-Fehlern
    if (error.status === 0 || error.status >= 500) {
      console.warn('🌐 Network or server error, marking Rhino as unavailable');
      this.isAvailable = false;
    }

    // Fallback-Verhalten
    if (this.config.fallbackOnError && fallbackValue !== undefined) {
      console.log(`🔄 Using fallback value for ${operation}`);
      return of(fallbackValue);
    }

    // Benutzerfreundliche Fehlermeldung
    const userMessage = this.getUserFriendlyErrorMessage(error);
    return throwError(() => new Error(userMessage));
  }

  /**
   * Erstellt benutzerfreundliche Fehlermeldungen
   * @param error - HTTP-Fehler
   * @returns Benutzerfreundliche Fehlermeldung
   */
  private getUserFriendlyErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Verbindung zum Server fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung.';
    }

    if (error.status === 404) {
      return 'Rhino-Service nicht gefunden. Möglicherweise ist das Backend nicht verfügbar.';
    }

    if (error.status >= 500) {
      return 'Server-Fehler beim Rhino-Service. Bitte versuchen Sie es später erneut.';
    }

    if (error.error?.message) {
      return error.error.message;
    }

    return `Unbekannter Fehler beim Rhino-Service (${error.status})`;
  }
}

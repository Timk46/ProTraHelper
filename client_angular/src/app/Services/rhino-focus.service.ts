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
  UnifiedRhinoFocusResponseDTO,
  NativeFocusRequestDTO,
  EnsureRhinoActiveRequestDTO,
  EnsureRhinoActiveResponseDTO,
  RhinoAvailabilityStatusDTO,
} from '../../../../shared/dtos/index';

/**
 * Konfiguration für Rhino Focus Service
 */
interface RhinoFocusConfig {
  enabled: boolean;
  retryAttempts: number;
  timeoutMs: number;
  delayBeforeFocusMs: number;
  fallbackOnError: boolean;
  useNativeImplementation: boolean;
  preferUnifiedApproach: boolean;
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
  useNativeImplementation: true,
  preferUnifiedApproach: true,
};

@Injectable({
  providedIn: 'root',
})
export class RhinoFocusService {
  private readonly baseUrl = `${environment.server}/api/rhinodirect`;
  private readonly unifiedBaseUrl = `${environment.server}/api/rhinounified`;
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
   * Fokussiert ein Rhino-Fenster mit der besten verfügbaren Methode
   * @param request - Fokussierungs-Anfrage
   * @returns Observable mit Fokussierungs-Ergebnis
   */
  focusRhinoWindow(request: RhinoFocusRequestDTO = {}): Observable<RhinoFocusResponseDTO> {
    console.log('is config enabled', this.config.enabled);
    console.log('is available', this.isAvailable);
    console.log('prefer unified approach', this.config.preferUnifiedApproach);
    
    if (!this.config.enabled || this.isAvailable === false) {
      console.log('🚫 Rhino focus disabled or unavailable');
      return of({
        success: false,
        message: 'Rhino-Fokussierung nicht verfügbar',
        timestamp: new Date().toISOString(),
      });
    }

    // Use unified approach if preferred and available
    if (this.config.preferUnifiedApproach) {
      return this.focusRhinoWindowUnified(request).pipe(
        map((unifiedResponse: UnifiedRhinoFocusResponseDTO) => ({
          success: unifiedResponse.success,
          message: unifiedResponse.message,
          windowInfo: unifiedResponse.windowInfo,
          timestamp: unifiedResponse.timestamp,
        })),
      );
    }

    // Fallback to original PowerShell method
    return this.focusRhinoWindowPowerShell(request);
  }

  /**
   * Fokussiert ein Rhino-Fenster mit unified approach (native + PowerShell fallback)
   * @param request - Fokussierungs-Anfrage
   * @returns Observable mit unified Fokussierungs-Ergebnis
   */
  focusRhinoWindowUnified(request: RhinoFocusRequestDTO = {}): Observable<UnifiedRhinoFocusResponseDTO> {
    console.log('🎯 Unified Rhino focus:', request);

    if (!this.config.enabled || this.isAvailable === false) {
      console.log('🚫 Rhino unified focus disabled or unavailable');
      return of({
        success: false,
        message: 'Rhino-Fokussierung nicht verfügbar',
        implementation: 'error',
        timestamp: new Date().toISOString(),
      });
    }

    // Standard-Werte setzen
    const focusRequest: RhinoFocusRequestDTO = {
      bringToFront: true,
      restoreIfMinimized: true,
      ...request,
    };

    return this.http.post<UnifiedRhinoFocusResponseDTO>(`${this.baseUrl}/focus-window-unified`, focusRequest).pipe(
      timeout(this.config.timeoutMs),
      retry(this.config.retryAttempts),
      map((response: UnifiedRhinoFocusResponseDTO) => {
        console.log('✅ Unified Rhino focus result:', response);
        return response;
      }),
      catchError(error => this.handleError<UnifiedRhinoFocusResponseDTO>('focusRhinoWindowUnified', error, {
        success: false,
        message: 'Unified focus failed',
        implementation: 'error',
        timestamp: new Date().toISOString(),
      })),
    );
  }

  /**
   * Fokussiert ein Rhino-Fenster nur mit der nativen Implementierung
   * @param windowHandle - Window Handle des zu fokussierenden Fensters
   * @returns Observable mit native Fokussierungs-Ergebnis
   */
  focusRhinoWindowNative(windowHandle: string | number): Observable<UnifiedRhinoFocusResponseDTO> {
    console.log('🚀 Native Rhino focus:', windowHandle);

    if (!this.config.enabled || !this.config.useNativeImplementation || this.isAvailable === false) {
      console.log('🚫 Native Rhino focus disabled or unavailable');
      return of({
        success: false,
        message: 'Native Rhino-Fokussierung nicht verfügbar oder deaktiviert',
        implementation: 'error',
        timestamp: new Date().toISOString(),
      });
    }

    const nativeRequest: NativeFocusRequestDTO = {
      windowHandle,
    };

    return this.http.post<UnifiedRhinoFocusResponseDTO>(`${this.baseUrl}/focus-window-native`, nativeRequest).pipe(
      timeout(this.config.timeoutMs),
      retry(this.config.retryAttempts),
      map((response: UnifiedRhinoFocusResponseDTO) => {
        console.log('✅ Native Rhino focus result:', response);
        return response;
      }),
      catchError(error => this.handleError<UnifiedRhinoFocusResponseDTO>('focusRhinoWindowNative', error, {
        success: false,
        message: 'Native focus failed',
        implementation: 'error',
        timestamp: new Date().toISOString(),
      })),
    );
  }

  /**
   * Fokussiert ein Rhino-Fenster mit der ursprünglichen PowerShell-Implementierung
   * @param request - Fokussierungs-Anfrage
   * @returns Observable mit Fokussierungs-Ergebnis
   */
  focusRhinoWindowPowerShell(request: RhinoFocusRequestDTO = {}): Observable<RhinoFocusResponseDTO> {
    console.log('🔄 PowerShell Rhino focus:', request);

    if (!this.config.enabled || this.isAvailable === false) {
      console.log('🚫 PowerShell Rhino focus disabled or unavailable');
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

    return this.http.post<RhinoFocusResponseDTO>(`${this.baseUrl}/focus-window`, focusRequest).pipe(
      timeout(this.config.timeoutMs),
      retry(this.config.retryAttempts),
      map((response: RhinoFocusResponseDTO) => {
        console.log('✅ PowerShell Rhino focus result:', response);
        return response;
      }),
      catchError(error => this.handleError<RhinoFocusResponseDTO>('focusRhinoWindowPowerShell', error)),
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
      switchMap(windows => {
        // Handle no windows found case
        if (windows.length === 0) {
          return of({
            success: false,
            message: 'Keine Rhino-Fenster gefunden',
            timestamp: new Date().toISOString(),
          });
        }

        // Focus the first window - return Observable directly
        const firstWindow = windows[0];
        return this.focusRhinoWindow({
          processId: firstWindow.processId,
          bringToFront: true,
          restoreIfMinimized: true,
        });
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
   * Prüft den Status der nativen Implementierung
   * @returns Observable mit Status-Informationen
   */
  checkNativeImplementationStatus(): Observable<{
    available: boolean;
    enabled: boolean;
    message: string;
    details?: {
      koffiLoaded: boolean;
      winApiInitialized: boolean;
    };
  }> {
    return this.http.get<{
      available: boolean;
      enabled: boolean;
      message: string;
      details?: {
        koffiLoaded: boolean;
        winApiInitialized: boolean;
      };
    }>(`${this.baseUrl}/native-status`).pipe(
      timeout(this.config.timeoutMs),
      map(response => {
        console.log('📊 Native implementation status:', response);
        return response;
      }),
      catchError(error => {
        console.warn('⚠️ Native status check failed:', error);
        return of({
          available: false,
          enabled: false,
          message: 'Status check failed',
        });
      }),
    );
  }

  /**
   * Aktiviert/Deaktiviert die native Implementierung als Standard im Backend
   * @param enabled - Aktivierungsstatus
   * @returns Observable mit Konfigurationsergebnis
   */
  setNativeAsDefault(enabled: boolean): Observable<{
    success: boolean;
    message: string;
    nativeEnabled: boolean;
    nativeAvailable: boolean;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      nativeEnabled: boolean;
      nativeAvailable: boolean;
    }>(`${this.baseUrl}/set-native-default`, { enabled }).pipe(
      timeout(this.config.timeoutMs),
      map(response => {
        console.log(`⚙️ Native implementation ${enabled ? 'enabled' : 'disabled'} as default:`, response);
        return response;
      }),
      catchError(error => {
        console.warn('⚠️ Failed to set native as default:', error);
        return of({
          success: false,
          message: 'Configuration update failed',
          nativeEnabled: false,
          nativeAvailable: false,
        });
      }),
    );
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
   * Aktiviert/Deaktiviert die native Implementierung lokal
   * @param enabled - Aktivierungsstatus
   */
  setUseNativeImplementation(enabled: boolean): void {
    this.config.useNativeImplementation = enabled;
    console.log(`${enabled ? '✅' : '🚫'} Native implementation ${enabled ? 'enabled' : 'disabled'} locally`);
  }

  /**
   * Aktiviert/Deaktiviert den unified approach
   * @param enabled - Aktivierungsstatus
   */
  setPreferUnifiedApproach(enabled: boolean): void {
    this.config.preferUnifiedApproach = enabled;
    console.log(`${enabled ? '✅' : '🚫'} Unified approach ${enabled ? 'preferred' : 'disabled'}`);
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
   * Ensures Rhino is active - intelligently focuses existing window or launches new instance
   * This is the main method for unified Rhino management
   * @param request - Configuration for the ensure operation
   * @returns Observable with ensure operation result
   */
  ensureRhinoActive(request: EnsureRhinoActiveRequestDTO = {}): Observable<EnsureRhinoActiveResponseDTO> {
    console.log('🎯 Ensuring Rhino is active:', request);

    if (!this.config.enabled) {
      console.log('🚫 Rhino service disabled');
      return of({
        success: false,
        message: 'Rhino-Service ist deaktiviert',
        action: 'failed',
        timestamp: new Date().toISOString(),
        performanceMs: 0,
        warnings: ['Service deaktiviert']
      });
    }

    return this.http.post<EnsureRhinoActiveResponseDTO>(`${this.unifiedBaseUrl}/ensure-active`, request).pipe(
      timeout(this.config.timeoutMs),
      retry(this.config.retryAttempts),
      map((response: EnsureRhinoActiveResponseDTO) => {
        console.log('✅ Ensure Rhino active result:', response);
        return response;
      }),
      catchError(error => this.handleError<EnsureRhinoActiveResponseDTO>('ensureRhinoActive', error, {
        success: false,
        message: 'Fehler bei der Rhino-Aktivierung',
        action: 'failed',
        timestamp: new Date().toISOString(),
        performanceMs: 0,
        warnings: [this.getUserFriendlyErrorMessage(error)]
      })),
    );
  }

  /**
   * Checks Rhino availability status
   * @returns Observable with availability status
   */
  checkRhinoAvailabilityStatus(): Observable<RhinoAvailabilityStatusDTO> {
    console.log('🔍 Checking Rhino availability status');

    if (!this.config.enabled) {
      return of({
        isRunning: false,
        isInstalled: false,
        windowCount: 0,
        installations: [],
        nativeFocusAvailable: false,
        powershellFocusAvailable: false,
        recommendedAction: 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    return this.http.get<RhinoAvailabilityStatusDTO>(`${this.unifiedBaseUrl}/availability`).pipe(
      timeout(this.config.timeoutMs),
      retry(this.config.retryAttempts),
      map((status: RhinoAvailabilityStatusDTO) => {
        console.log('✅ Rhino availability status:', status);
        return status;
      }),
      catchError(error => {
        console.error('❌ Availability check failed:', error);
        return of({
          isRunning: false,
          isInstalled: false,
          windowCount: 0,
          installations: [],
          nativeFocusAvailable: false,
          powershellFocusAvailable: false,
          recommendedAction: 'unknown' as const,
          timestamp: new Date().toISOString()
        });
      }),
    );
  }

  /**
   * Focus existing Rhino window only (without launching)
   * @param focusMethod - Method to use for focusing
   * @returns Observable with focus result
   */
  focusOnlyRhino(focusMethod: 'native' | 'powershell' | 'unified' = 'unified'): Observable<EnsureRhinoActiveResponseDTO> {
    console.log('🎯 Focus-only Rhino:', { focusMethod });

    if (!this.config.enabled) {
      return of({
        success: false,
        message: 'Rhino-Service ist deaktiviert',
        action: 'failed',
        timestamp: new Date().toISOString(),
        performanceMs: 0
      });
    }

    const request = { focusMethod };

    return this.http.post<EnsureRhinoActiveResponseDTO>(`${this.unifiedBaseUrl}/focus-only`, request).pipe(
      timeout(this.config.timeoutMs),
      retry(this.config.retryAttempts),
      map((response: EnsureRhinoActiveResponseDTO) => {
        console.log('✅ Focus-only result:', response);
        return response;
      }),
      catchError(error => this.handleError<EnsureRhinoActiveResponseDTO>('focusOnlyRhino', error, {
        success: false,
        message: 'Fehler beim Fokussieren von Rhino',
        action: 'failed',
        timestamp: new Date().toISOString(),
        performanceMs: 0,
        warnings: [this.getUserFriendlyErrorMessage(error)]
      })),
    );
  }

  /**
   * Launch new Rhino instance (always launches, doesn't focus existing)
   * @param grasshopperFilePath - Optional Grasshopper file to open
   * @param userId - User ID for tracking
   * @returns Observable with launch result
   */
  launchOnlyRhino(grasshopperFilePath?: string, userId?: string): Observable<EnsureRhinoActiveResponseDTO> {
    console.log('🚀 Launch-only Rhino:', { grasshopperFilePath, userId });

    if (!this.config.enabled) {
      return of({
        success: false,
        message: 'Rhino-Service ist deaktiviert',
        action: 'failed',
        timestamp: new Date().toISOString(),
        performanceMs: 0
      });
    }

    const request = { grasshopperFilePath, userId: userId || 'web-user' };

    return this.http.post<EnsureRhinoActiveResponseDTO>(`${this.unifiedBaseUrl}/launch-only`, request).pipe(
      timeout(this.config.timeoutMs * 2), // Double timeout for launch operations
      retry(this.config.retryAttempts),
      map((response: EnsureRhinoActiveResponseDTO) => {
        console.log('✅ Launch-only result:', response);
        return response;
      }),
      catchError(error => this.handleError<EnsureRhinoActiveResponseDTO>('launchOnlyRhino', error, {
        success: false,
        message: 'Fehler beim Starten von Rhino',
        action: 'failed',
        timestamp: new Date().toISOString(),
        performanceMs: 0,
        warnings: [this.getUserFriendlyErrorMessage(error)]
      })),
    );
  }

  /**
   * Gets comprehensive system status for debugging
   * @returns Observable with detailed system status
   */
  getSystemStatus(): Observable<any> {
    console.log('🔧 Getting system status');

    return this.http.get(`${this.unifiedBaseUrl}/system-status`).pipe(
      timeout(this.config.timeoutMs),
      map((status: any) => {
        console.log('✅ System status:', status);
        return status;
      }),
      catchError(error => {
        console.error('❌ System status failed:', error);
        return of({
          error: this.getUserFriendlyErrorMessage(error),
          timestamp: new Date().toISOString()
        });
      }),
    );
  }

  /**
   * Enhanced version of the original focusRhinoWindow that uses unified approach
   * Maintains backwards compatibility while providing improved functionality
   * @param request - Focus request parameters
   * @returns Observable with focus result
   */
  focusRhinoWindowEnhanced(request: RhinoFocusRequestDTO = {}): Observable<RhinoFocusResponseDTO> {
    console.log('🎯 Enhanced Rhino focus (with fallback to launch):', request);

    // Convert old request format to new format
    const unifiedRequest: EnsureRhinoActiveRequestDTO = {
      focusMethod: 'unified',
      bringToFront: request.bringToFront !== false,
      restoreIfMinimized: request.restoreIfMinimized !== false
    };

    return this.ensureRhinoActive(unifiedRequest).pipe(
      map((unifiedResponse: EnsureRhinoActiveResponseDTO) => {
        // Convert back to old response format for backwards compatibility
        const legacyResponse: RhinoFocusResponseDTO = {
          success: unifiedResponse.success,
          message: unifiedResponse.message,
          windowInfo: unifiedResponse.windowInfo,
          timestamp: unifiedResponse.timestamp,
        };
        return legacyResponse;
      })
    );
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

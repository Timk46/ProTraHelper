/**
 * Direct Rhino Launcher Service
 * Alternative Rhino-Start-Mechanismus ohne Helper-App Abhängigkeit
 * Nutzt direkte Windows-Prozess-Ausführung über Backend-API
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

export interface DirectRhinoLaunchRequest {
  filePath: string;
  rhinoPath?: string; // Optional: Spezifischer Rhino-Pfad
  showViewport?: boolean;
  batchMode?: boolean;
}

export interface DirectRhinoLaunchResponse {
  success: boolean;
  message: string;
  processId?: number;
  commandUsed?: string;
  rhinoPath?: string;
  executionMethod: 'direct' | 'registry' | 'fallback';
}

export interface RhinoInstallation {
  version: string;
  path: string;
  isDefault: boolean;
}

export interface SystemRhinoInfo {
  installations: RhinoInstallation[];
  defaultPath?: string;
  registryAvailable: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DirectRhinoLauncherService {
  private readonly baseUrl = 'http://localhost:3000'; // NestJS Backend
  private readonly timeoutMs = 30000;

  constructor(private http: HttpClient) {
    console.log('🚀 Direct Rhino Launcher Service initialized');
  }

  /**
   * Startet Rhino direkt über Windows-Prozess ohne Helper-App
   */
  launchRhinoDirect(request: DirectRhinoLaunchRequest): Observable<DirectRhinoLaunchResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    console.log('🚀 Launching Rhino directly via backend API:', request);

    return this.http.post<DirectRhinoLaunchResponse>(
      `${this.baseUrl}/api/rhino/launch-direct`,
      request,
      { headers }
    ).pipe(
      timeout(this.timeoutMs),
      catchError(error => this.handleError('launchRhinoDirect', error))
    );
  }

  /**
   * Ermittelt verfügbare Rhino-Installationen über Registry
   */
  getSystemRhinoInfo(): Observable<SystemRhinoInfo> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.get<SystemRhinoInfo>(
      `${this.baseUrl}/api/rhino/system-info`,
      { headers }
    ).pipe(
      timeout(5000),
      catchError(error => this.handleError('getSystemRhinoInfo', error))
    );
  }

  /**
   * Startet Rhino mit automatischer Pfad-Erkennung
   */
  launchRhinoAuto(filePath: string): Observable<DirectRhinoLaunchResponse> {
    return this.launchRhinoDirect({
      filePath,
      showViewport: true,
      batchMode: true
    });
  }

  /**
   * Testet ob Rhino-Ausführung verfügbar ist
   */
  testRhinoAvailability(): Observable<boolean> {
    return this.http.get<{ available: boolean }>(
      `${this.baseUrl}/api/rhino/test-availability`
    ).pipe(
      timeout(5000),
      catchError(() => [{ available: false }])
    ).pipe(
      catchError(() => [false])
    ) as Observable<boolean>;
  }

  private handleError(operation: string, error: any): Observable<never> {
    console.error(`🚨 ${operation} failed:`, error);

    let errorMessage = 'Unbekannter Fehler';
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(`${operation}: ${errorMessage}`));
  }
}

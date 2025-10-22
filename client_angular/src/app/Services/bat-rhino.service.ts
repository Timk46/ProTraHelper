import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  BatRhinoRequest,
  BatRhinoResponse,
  RhinoPathDetectionResponse,
  BatRhinoSetupStatus,
} from '@DTOs/index';
import { LoggerService } from './logger/logger.service';

/**
 * BatRhinoService
 * Service für die .bat-Skript-basierte Rhino-Integration
 * Verwendet direkte HTTP-Aufrufe ohne Proxy-Konfiguration
 */
@Injectable({
  providedIn: 'root',
})
export class BatRhinoService {
  private readonly log = this.logger.scope('BatRhinoService');
  private readonly baseUrl = `${environment.server}/api/rhinobat`;

  constructor(
    private readonly http: HttpClient,
    private readonly logger: LoggerService
  ) {}

  /**
   * Führt Rhino-Befehle direkt aus (ohne Download)
   * Best Practice: Ein-Klick-Lösung für sofortige Rhino-Ausführung
   * @param request - Anfrage mit Rhino-Befehl und Dateipfad
   * @returns Observable mit Ausführungsergebnis
   */
  executeDirectly(request: BatRhinoRequest): Observable<BatRhinoResponse> {

    // Map BatRhinoRequest to DirectRhinoLaunchRequest format expected by backend
    const directRequest = {
      filePath: request.filePath,
      rhinoPath: undefined, // Let backend auto-detect
      showViewport: request.showViewport || true,
      batchMode: request.batchMode || true,
    };


    return this.http.post<any>(`${this.baseUrl}/launch-direct`, directRequest).pipe(
      map(response => ({
        success: response.success || false,
        message: response.message || 'Unbekannte Antwort',
        batScriptPath: undefined, // Not provided by direct execution
        downloadUrl: undefined, // Not provided by direct execution
        executionId: response.processId?.toString(), // Map processId to executionId
        rhinoPath: response.rhinoPath,
        timestamp: new Date().toISOString(),
      })),
      tap((response: BatRhinoResponse) => {
        if (!response.success) {
          this.log.error('BatRhinoService direct execution failed', { response });
        }
      }),
      catchError(error => {
        this.log.error('BatRhinoService direct execution error', { error });
        return of({
          success: false,
          message: `Fehler bei der direkten Rhino-Ausführung: ${
            error.error?.message || error.message
          }`,
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }

  /**
   * Generiert .bat-Skript für Rhino-Integration
   * @param request - Anfrage mit Rhino-Befehl und Dateipfad
   * @returns Observable mit Generierungsergebnis
   */
  generateScript(request: BatRhinoRequest): Observable<BatRhinoResponse> {

    return this.http.post<BatRhinoResponse>(`${this.baseUrl}/generate-script`, request).pipe(
      map(response => {
        return response;
      }),
      catchError(this.handleError),
    );
  }

  /**
   * Erkennt automatisch den Rhino-Installationspfad
   * @returns Observable mit erkannten Rhino-Installationen
   */
  detectRhinoPath(): Observable<RhinoPathDetectionResponse> {

    return this.http.get<RhinoPathDetectionResponse>(`${this.baseUrl}/detect-rhino-path`).pipe(
      map(response => {
        return response;
      }),
      catchError(this.handleError),
    );
  }

  /**
   * Überprüft den Setup-Status des Bat-Rhino Systems
   * @returns Observable mit Setup-Status-Informationen
   */
  getSetupStatus(): Observable<BatRhinoSetupStatus> {

    return this.http.get<BatRhinoSetupStatus>(`${this.baseUrl}/setup-status`).pipe(
      map(response => {
        return response;
      }),
      catchError(this.handleError),
    );
  }

  /**
   * Erstellt eine Standard-Anfrage für Grasshopper-Dateien
   * @param filePath - Pfad zur Grasshopper-Datei
   * @returns Vorkonfigurierte BatRhinoRequest
   */
  createGrasshopperRequest(filePath: string): BatRhinoRequest {
    const rhinoCommand = `_-Grasshopper B D W L W H D O "${filePath}" W _MaxViewport _Enter`;

    return {
      filePath: filePath,
      rhinoCommand: rhinoCommand,
      showViewport: true,
      batchMode: true,
      outputDirectory: undefined, // Verwendet Server-Standard
    };
  }

  /**
   * Behandelt HTTP-Fehler und gibt benutzerfreundliche Fehlermeldungen zurück
   * @param error - HTTP-Fehler-Response
   * @returns Observable mit Fehlermeldung
   */
  private readonly handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Ein unbekannter Fehler ist aufgetreten';

    if (error.error instanceof ErrorEvent) {
      // Client-seitiger Fehler
      errorMessage = `Client-Fehler: ${error.error.message}`;
    } else {
      // Server-seitiger Fehler
      switch (error.status) {
        case 401:
          errorMessage = 'Nicht autorisiert. Bitte melden Sie sich an.';
          break;
        case 403:
          errorMessage = 'Zugriff verweigert. Unzureichende Berechtigung.';
          break;
        case 404:
          errorMessage = 'Bat-Rhino Service nicht gefunden. Ist der Server gestartet?';
          break;
        case 500:
          errorMessage = 'Server-Fehler bei der Skript-Generierung.';
          break;
        default:
          errorMessage = `Server-Fehler: ${error.status} - ${error.message}`;
      }

      // Zusätzliche Fehlerdetails aus der Server-Response
      if (error.error?.message) {
        errorMessage += ` Details: ${error.error.message}`;
      }
    }

    this.log.error('BatRhinoService error', { errorMessage, error });
    return throwError(() => new Error(errorMessage));
  };
}

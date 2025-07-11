import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  BatRhinoRequest,
  BatRhinoResponse,
  RhinoPathDetectionResponse,
  BatRhinoSetupStatus
} from '../../../../shared/dtos/bat-rhino.dto';

/**
 * BatRhinoService
 * Service für die .bat-Skript-basierte Rhino-Integration
 * Verwendet direkte HTTP-Aufrufe ohne Proxy-Konfiguration
 */
@Injectable({
  providedIn: 'root'
})
export class BatRhinoService {
  private readonly baseUrl = `${environment.server}/api/rhino`;

  constructor(private http: HttpClient) {}

  /**
   * Führt Rhino-Befehle direkt aus (ohne Download)
   * Best Practice: Ein-Klick-Lösung für sofortige Rhino-Ausführung
   * @param request - Anfrage mit Rhino-Befehl und Dateipfad
   * @returns Observable mit Ausführungsergebnis
   */
  executeDirectly(request: BatRhinoRequest): Observable<BatRhinoResponse> {
    console.log('🔧 BatRhinoService: Executing Rhino directly with request:', request);

    // Map BatRhinoRequest to DirectRhinoLaunchRequest format expected by backend
    const directRequest = {
      filePath: request.filePath,
      rhinoPath: undefined, // Let backend auto-detect
      showViewport: request.showViewport || true,
      batchMode: request.batchMode || true
    };

    console.log('🔧 BatRhinoService: Mapped request for direct execution:', directRequest);

    return this.http.post<any>(`${this.baseUrl}/launch-direct`, directRequest).pipe(
      map(response => ({
        success: response.success || false,
        message: response.message || 'Unbekannte Antwort',
        batScriptPath: undefined, // Not provided by direct execution
        downloadUrl: undefined, // Not provided by direct execution
        executionId: response.processId?.toString(), // Map processId to executionId
        rhinoPath: response.rhinoPath,
        timestamp: new Date().toISOString()
      })),
      tap((response: BatRhinoResponse) => {
        if (response.success) {
          console.log('✅ BatRhinoService: Direct execution successful:', response);
        } else {
          console.error('❌ BatRhinoService: Direct execution failed:', response);
        }
      }),
      catchError(error => {
        console.error('🚨 BatRhinoService: Direct execution error:', error);
        return of({
          success: false,
          message: `Fehler bei der direkten Rhino-Ausführung: ${error.error?.message || error.message}`,
          timestamp: new Date().toISOString()
        });
      })
    );
  }

  /**
   * Generiert .bat-Skript für Rhino-Integration
   * @param request - Anfrage mit Rhino-Befehl und Dateipfad
   * @returns Observable mit Generierungsergebnis
   */
  generateScript(request: BatRhinoRequest): Observable<BatRhinoResponse> {
    console.log('🔧 BatRhinoService: Generating script with request:', request); 

    return this.http.post<BatRhinoResponse>(`${this.baseUrl}/generate-script`, request)
      .pipe(
        map(response => {
          console.log('✅ BatRhinoService: Script generation successful:', response);
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Erkennt automatisch den Rhino-Installationspfad
   * @returns Observable mit erkannten Rhino-Installationen
   */
  detectRhinoPath(): Observable<RhinoPathDetectionResponse> {
    console.log('🔍 BatRhinoService: Detecting Rhino path...');

    return this.http.get<RhinoPathDetectionResponse>(`${this.baseUrl}/detect-rhino-path`)
      .pipe(
        map(response => {
          console.log('✅ BatRhinoService: Rhino path detection result:', response);
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Überprüft den Setup-Status des Bat-Rhino Systems
   * @returns Observable mit Setup-Status-Informationen
   */
  getSetupStatus(): Observable<BatRhinoSetupStatus> {
    console.log('📊 BatRhinoService: Getting setup status...');

    return this.http.get<BatRhinoSetupStatus>(`${this.baseUrl}/setup-status`)
      .pipe(
        map(response => {
          console.log('✅ BatRhinoService: Setup status retrieved:', response);
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Erstellt eine Standard-Anfrage für Grasshopper-Dateien
   * @param filePath - Pfad zur Grasshopper-Datei
   * @returns Vorkonfigurierte BatRhinoRequest
   */
  createGrasshopperRequest(filePath: string): BatRhinoRequest {
    const rhinoCommand = `_-Grasshopper B D W L W H D O "${filePath}" W H _MaxViewport _Enter`;

    return {
      filePath: filePath,
      rhinoCommand: rhinoCommand,
      showViewport: true,
      batchMode: true,
      outputDirectory: undefined // Verwendet Server-Standard
    };
  }

  /**
   * Behandelt HTTP-Fehler und gibt benutzerfreundliche Fehlermeldungen zurück
   * @param error - HTTP-Fehler-Response
   * @returns Observable mit Fehlermeldung
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
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
      if (error.error && error.error.message) {
        errorMessage += ` Details: ${error.error.message}`;
      }
    }

    console.error('🚨 BatRhinoService Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  };
}

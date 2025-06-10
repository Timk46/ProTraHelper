import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

export interface GrasshopperFile {
  id: string;
  name: string;
  path: string; // This will be the absolute path on the server, or a server-retrievable identifier
}

// Interface für die Antwort vom /status Endpunkt der Helper-App
export interface HelperAppStatus {
  status: string;
  version: string;
  serverTime: string;
  rhinoPathConfigured: boolean;
  rhinoPath: string;
}

// Interface für die Antwort vom /launch-rhino Endpunkt
export interface LaunchRhinoResponse {
  success: boolean;
  message: string;
}

@Injectable()
export class RhinoLauncherService {
  private helperAppUrl = 'http://localhost:3001'; // Basis-URL der Helfer-App
  private apiToken: string | null = null;

  constructor(private http: HttpClient) {
    this.loadApiToken(); // Token beim Initialisieren des Services laden
  }

  setApiToken(token: string): void {
    this.apiToken = token;
    localStorage.setItem('protraHelperApiToken', token);
  }

  loadApiToken(): void {
    if (typeof localStorage !== 'undefined') { // Sicherstellen, dass localStorage verfügbar ist (wichtig für SSR/Universal)
      this.apiToken = localStorage.getItem('protraHelperApiToken');
    }
  }

  clearApiToken(): void {
    this.apiToken = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('protraHelperApiToken');
    }
  }

  getApiToken(): string | null {
    return this.apiToken;
  }

  // Fetches available .gh files from the server
  getGrasshopperFiles(): Observable<GrasshopperFile[]> {
    // This API endpoint needs to be implemented in the NestJS backend
    // Corrected to point to the NestJS server (default port 3000)
    return this.http.get<GrasshopperFile[]>('http://localhost:3000/api/gh-files');
  }

  // NEU: Status der Helfer-App abfragen
  getHelperAppStatus(): Observable<HelperAppStatus> {
    return this.http.get<HelperAppStatus>(`${this.helperAppUrl}/status`).pipe(
      timeout(3000), // Timeout nach 3 Sekunden, falls Helfer-App nicht antwortet
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Helferanwendung nicht erreichbar oder antwortet nicht.';
        if (error.error instanceof ErrorEvent) {
          // Client-seitiger oder Netzwerkfehler
          console.error('Client-seitiger Fehler:', error.error.message);
        } else {
          // Backend hat einen Fehlercode zurückgegeben
          console.error(
            `Helfer-App Fehlercode ${error.status}, ` +
            `Body war: ${JSON.stringify(error.error)}`);
          if (error.status === 0) { // Typischer Fehler, wenn Server nicht läuft
             errorMessage = 'Helferanwendung ist nicht gestartet oder blockiert. Bitte starten Sie die ProTra-Helferanwendung.';
          }
        }
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // NEU oder angepasst: Rhino mit einer Datei starten über die Helfer-App
  launchRhinoWithHelper(ghFilePath: string): Observable<LaunchRhinoResponse> {
    if (!this.apiToken) {
      return throwError(() => new Error('API-Token für Helferanwendung nicht konfiguriert. Bitte im Launcher-Bereich eintragen.'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Protra-Helper-Token': this.apiToken
    });

    return this.http.post<LaunchRhinoResponse>(
      `${this.helperAppUrl}/launch-rhino`,
      { ghFilePath }, // Der Key muss mit dem Server übereinstimmen
      { headers }
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Fehler beim Starten von Rhino über Helfer-App:', error);
        // Versuche, die Nachricht aus der Fehlerantwort des Servers zu extrahieren
        const serverErrorMessage = error.error?.message || error.message || 'Unbekannter Fehler beim Starten von Rhino.';
        return throwError(() => new Error(serverErrorMessage));
      })
    );
  }
}

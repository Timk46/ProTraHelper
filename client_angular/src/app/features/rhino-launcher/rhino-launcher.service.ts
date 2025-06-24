import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { HelperAppHttpService } from '../../Services/helper-app-http.service';

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
  commandUsed?: string; // Der verwendete Rhino-Befehl (für Debugging/Info)
  processId?: number;   // Die Prozess-ID des gestarteten Rhino-Prozesses
}

// Interface für Command-Informationen
export interface RhinoCommandInfo {
  fileName: string;
  commandTemplate: string;
  finalCommand: string;
  description?: string;
}

@Injectable()
export class RhinoLauncherService {
  private helperAppUrl = 'http://localhost:3001'; // Basis-URL der Helfer-App
  private apiToken: string | null = null;

  constructor(
    private http: HttpClient,
    private helperAppHttp: HelperAppHttpService
  ) {
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

  // NEU: Status der Helfer-App abfragen - verwendet HelperAppHttpService für CORS-freie Kommunikation
  getHelperAppStatus(): Observable<HelperAppStatus> {
    return this.helperAppHttp.get<HelperAppStatus>(`${this.helperAppUrl}/status`);
  }

  // NEU oder angepasst: Rhino mit einer Datei starten über die Helfer-App - verwendet HelperAppHttpService
  /**
   * Startet Rhino über die Helfer-App und übergibt den Pfad zu einer Grasshopper-Datei.
   *
   * @param ghFilePath - Der vollständige Pfad zur .gh-Datei, die geladen werden soll.
   * @returns Ein Observable mit dem Launch-Ergebnis (LaunchRhinoResponse).
   */
  launchRhinoWithHelper(ghFilePath: string): Observable<LaunchRhinoResponse> {
    // Prüfe, ob ein API-Token gesetzt ist. Ohne Token kann die Helfer-App nicht angesprochen werden.
    if (!this.apiToken) {
      // Gibt einen Fehler zurück, falls kein Token vorhanden ist.
      return throwError(() => new Error('API-Token für Helferanwendung nicht konfiguriert. Bitte im Launcher-Bereich eintragen.'));
    }

    // Setze die HTTP-Header, insbesondere das API-Token für die Authentifizierung.
    const headers = new HttpHeaders({
      'X-Protra-Helper-Token': this.apiToken
    });

    // Sende eine POST-Anfrage an die Helfer-App, um Rhino mit der angegebenen Datei zu starten.
    // Der Body enthält den Dateipfad (ghFilePath) als Property.
    // Die Antwort ist ein Observable mit dem LaunchRhinoResponse-Objekt.
    return this.helperAppHttp.post<LaunchRhinoResponse>(
      `${this.helperAppUrl}/launch-rhino`,
      { ghFilePath }, // Der Key muss mit dem Server übereinstimmen
      { headers }
    );
  }
}

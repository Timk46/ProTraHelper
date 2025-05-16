import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GrasshopperFile {
  id: string;
  name: string;
  path: string; // This will be the absolute path on the server, or a server-retrievable identifier
}

@Injectable()
export class RhinoLauncherService {
  constructor(private http: HttpClient) {}

  // Fetches available .gh files from the server
  getGrasshopperFiles(): Observable<GrasshopperFile[]> {
    // This API endpoint needs to be implemented in the NestJS backend
    // Corrected to point to the NestJS server (default port 3000)
    return this.http.get<GrasshopperFile[]>('http://localhost:3000/api/gh-files');
  }

  // Checks if the rhino:// custom protocol is supported by the browser/OS
  // This check is simplified to prevent premature script execution.
  // It will now always assume protocol support initially.
  // Actual success/failure will be determined upon click.
  checkRhinoProtocolSupport(): Promise<boolean> {
    // For now, we'll resolve true to prevent the iframe check from triggering the PowerShell script on page load.
    // A more sophisticated, non-intrusive check could be implemented later if needed,
    // or rely on the browser's behavior when the link is actually clicked.
    return Promise.resolve(true);
  }
}

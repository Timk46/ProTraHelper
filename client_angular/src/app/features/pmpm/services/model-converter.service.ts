import { Injectable } from '@angular/core';
import type { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

/**
 * Service for converting 3DM models to GLTF format that can be used in the web browser
 * This service interacts with the backend to perform the conversion
 */
@Injectable({
  providedIn: 'root',
})
export class ModelConverterService {
  private readonly apiUrl = `${environment.server}/pmpm`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Converts a Rhino 3DM model to GLTF format
   *
   * @param modelId The ID of the model to convert
   * @returns Observable with the path to the converted model
   */
  convertModel(modelId: string): Observable<string> {
    return this.http.post<{ modelPath: string }>(`${this.apiUrl}/convert`, { modelId }).pipe(
      map(response => response.modelPath),
      catchError(error => {
        console.error('Error converting model:', error);
        return throwError(() => new Error('Failed to convert 3DM model to GLTF format'));
      }),
    );
  }

  /**
   * Uploads a local 3DM file and converts it to GLTF
   *
   * @param file The 3DM file to upload and convert
   * @returns Observable with the path to the converted model
   */
  uploadAndConvert(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('model', file);

    return this.http.post<{ modelPath: string }>(`${this.apiUrl}/upload-convert`, formData).pipe(
      map(response => response.modelPath),
      catchError(error => {
        console.error('Error uploading and converting model:', error);
        return throwError(() => new Error('Failed to upload and convert 3DM model'));
      }),
    );
  }

  /**
   * Gets the URL for a stored model (either 3DM or GLTF)
   *
   * @param modelId The ID of the model
   * @param format The format of the model (gltf or 3dm)
   * @returns The full URL to the model
   */
  getModelUrl(modelId: string, format: 'gltf' | '3dm' = 'gltf'): string {
    return `${environment.server}/assets/models/${modelId}.${format}`;
  }

  /**
   * Checks if a converted model exists
   *
   * @param modelId The ID of the model to check
   * @returns Observable<boolean> indicating if the model exists
   */
  checkModelExists(modelId: string): Observable<boolean> {
    return this.http.head(`${this.apiUrl}/models/${modelId}/exists`).pipe(
      map(() => true),
      catchError(() => {
        // If head request fails (e.g., 404), model doesn't exist
        return of(false);
      }),
    );
  }
}

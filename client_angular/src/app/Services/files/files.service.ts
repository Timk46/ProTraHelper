import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private readonly apiUrl = environment.server + '/files';

  constructor(private httpClient: HttpClient) {}

  /**
   * Uploads a given file to the server.
   *
   * @param file The file to be uploaded.
   * @returns An Observable containing the server response.
   */
  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.httpClient.post(`${this.apiUrl}/upload`, formData);
  }

  /**
   * Downloads a file based on a given unique identifier.
   *
   * @param uniqueIdentifier The unique identifier for the file to be downloaded.
   * @returns An Observable containing the server response, which includes the file as a Blob.
   */
  downloadFile(uniqueIdentifier: String): Observable<HttpResponse<Blob>> {
    return this.httpClient.get(`${this.apiUrl}/download/${uniqueIdentifier}`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  /**
   * Retrieves the metadata for a file based on its unique identifier.
   *
   * @param uniqueIdentifier The unique identifier for the file.
   * @returns An Observable containing the file metadata.
   */
  getFile(uniqueIdentifier: string): Observable<any> {
    return this.httpClient.get(`${this.apiUrl}/${uniqueIdentifier}`);
  }
}

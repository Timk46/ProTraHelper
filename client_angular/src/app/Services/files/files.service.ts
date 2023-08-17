import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class FilesService {

  /** Base URL of the API */
  private readonly BASE_URL: string = environment.server + '/files';

  constructor(private http: HttpClient) { }

  /**
   * Retrieves a file by its name.
   *
   * @param fileId The name of the file to retrieve.
   * @returns An observable containing the file data.
   */
  getFileByName(fileId: string): Observable<Blob> {
    return this.http.get(`${this.BASE_URL}/${fileId}`, { responseType: 'blob' });
  }
}

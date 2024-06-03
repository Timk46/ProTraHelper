import { editorElementDTO, editorModelDTO } from '@DTOs/index';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EditorCommunicationService {

  constructor(private http: HttpClient) { }

  /**
   * Gets the editor models from the server
   * @returns editorModelsDTO
   */
  getEditorModels(): Observable<editorModelDTO[]> {
    return this.http.get<editorModelDTO[]>(environment.server + `/editor/models/`);
  }

  /**
   * Gets an editor model from the server by id
   * @param editorModelId
   * @returns
   */
  getEditorElements(editorModel: string): Observable<editorElementDTO[]> {
    return this.http.get<editorElementDTO[]>(environment.server + `/editor/elements/${editorModel}`);
  }

}

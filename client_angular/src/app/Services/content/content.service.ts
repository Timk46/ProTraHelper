import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ContentsForConceptDTO } from '@DTOs/index';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContentService {

  constructor(private http: HttpClient) { }

  /**
   * Fetches all content for a specific conceptNode.
   * @param conceptId The id of a concept node.
   * @returns ContentsForConceptDTO - an object with two arrays of ContentDTO objects. One for the requiredBy and one for trainedBy relations.
   */
  fetchContentsForConcept(conceptId: number): Observable<ContentsForConceptDTO> {
    return this.http.get<ContentsForConceptDTO>(environment.server + `/content/byConceptNode/${conceptId}`)
  }

}

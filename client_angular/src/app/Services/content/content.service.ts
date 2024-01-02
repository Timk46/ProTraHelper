import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ContentsForConceptDTO, ContentElementStatusDTO } from '@DTOs/index';
import { catchError, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

const debug = true;
@Injectable({
  providedIn: 'root',
})
export class ContentService {
  constructor(private http: HttpClient) {}

  /**
   * Fetches all content for a specific conceptNode.
   * @param conceptId The id of a concept node.
   * @returns ContentsForConceptDTO - an object with two arrays of ContentDTO objects. One for the requiredBy and one for trainedBy relations.
   */
  fetchContentsForConcept(
    conceptId: number
  ): Observable<ContentsForConceptDTO> {
    return this.http.get<ContentsForConceptDTO>(
      environment.server + `/content/byConceptNode/${conceptId}`
    );
  }

  /**
   * Fetches the completion status of a content element for a specific user.
   * @param contentElementId The id of a content element.
   * @returns ContentElementStatusDTO - the status of the content element.
   */
  getContentElementCompletionStatus(
    contentElementId: number
  ): Observable<ContentElementStatusDTO> {
    debug && console.log('ContentService: getContentElementCompletionStatus');
    return this.http.get<ContentElementStatusDTO>(
      environment.server + `/content/status/${contentElementId}`
    );
  }
}

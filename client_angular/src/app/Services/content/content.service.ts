import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  ContentsForConceptDTO,
  ContentElementStatusDTO,
  ConceptNodeEditDTO,
  ContentViewDTO,
  ContentViewInformationDTO,
} from '@DTOs/index';
import { ConceptNodeDTO } from '@DTOs/index';
import { Observable } from 'rxjs';
import { catchError, tap, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ConceptNode } from '@DTOs/index';

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  public toggleCheckmarkStatus: Subject<{ contentElementId: number; isCompleted: boolean }> =
    new Subject<{ contentElementId: number; isCompleted: boolean }>();
  public toggleQuestionmarkStatus: Subject<{ contentElementId: number; hasQuestion: boolean }> =
    new Subject<{ contentElementId: number; hasQuestion: boolean }>();
  // public lastOpenedDate: Subject<Date> = new Subject<Date>();

  constructor(private readonly http: HttpClient) {}

  /**
   * Fetches all content for a specific conceptNode.
   * @param conceptId The id of a concept node.
   * @returns ContentsForConceptDTO - an object with two arrays of ContentDTO objects. One for the requiredBy and one for trainedBy relations.
   */
  fetchContentsForConcept(conceptId: number): Observable<ContentsForConceptDTO> {
    return this.http.get<ContentsForConceptDTO>(
      environment.server + `/content/byConceptNode/${conceptId}`,
    );
  }

  /**
   *
   * @returns All conceptNames in the database.
   */
  fetchAllConceptNames(): Observable<string[]> {
    return this.http.get<string[]>(environment.server + `/content/concepts`);
  }

  getConcepts(): Observable<ConceptNode[]> {
    return this.http.get<ConceptNode[]>(environment.server + `/content/conceptsFull`);
  }

  updateConcept(conceptId: number, concept: ConceptNodeEditDTO): Observable<boolean> {
    return this.http.put<boolean>(environment.server + `/content/concepts/${conceptId}`, concept);
  }

  getContentViews(contentNodeId: number): Observable<ContentViewInformationDTO[]> {
    return this.http.get<ContentViewInformationDTO[]>(
      environment.server + `/content/views/${contentNodeId}`,
    );
  }

  /**
   * Fetches the completion status of a content element for a specific user.
   * @param contentElementId The id of a content element.
   * @returns ContentElementStatusDTO - the status of the content element.
   */
  getContentElementStatus(contentElementId: number): Observable<ContentElementStatusDTO> {
    return this.http.get<ContentElementStatusDTO>(
      environment.server + `/content/status/${contentElementId}`,
    );
  }

  /**
   * Toggles the completion status of a content element for a specific user.
   * @param contentElementId The id of a content element.
   * @returns ContentElementStatusDTO - the status of the content element.
   */
  toggleContentElementCompletionStatus(
    contentElementId: number,
    conceptNodeId: number,
    level: number,
  ): Observable<boolean> {
    console.log(
      'toggleContentElementCompletionStatus: ' +
        contentElementId +
        ' ' +
        conceptNodeId +
        ' ' +
        level,
    );
    return this.http
      .get<boolean>(
        environment.server +
          `/content/toggleCheckmark/${contentElementId}/${conceptNodeId}/${level}`,
      )
      .pipe(
        tap((status: boolean) => {
          this.toggleCheckmarkStatus.next({
            contentElementId: contentElementId,
            isCompleted: status,
          });
        }),
      );
  }

  /**
   * Toggles the completion status of a content element for a specific user.
   * @param contentElementId The id of a content element.
   * @returns ContentElementStatusDTO - the status of the content element.
   */
  toggleContentElementQuestionStatus(contentElementId: number): Observable<boolean> {
    return this.http
      .get<boolean>(environment.server + `/content/toggleQuestionmark/${contentElementId}`)
      .pipe(
        tap((status: boolean) => {
          this.toggleQuestionmarkStatus.next({
            contentElementId: contentElementId,
            hasQuestion: status,
          });
        }),
      );
  }

  /**
   * Fetches the last opened date of a content node for a specific user.
   * @param contentNodeId The id of a content node.
   * @returns Date - the last opened date of the content node.
   */
  updateLastOpenedDate(contentNodeId: number): Observable<Date> {
    //console.log('ContentService: updateLastOpenedDate');
    return this.http.get<Date>(environment.server + `/content/lastOpenedDate/${contentNodeId}`);
  }
}

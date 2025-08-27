import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LinkableContentElementDTO, LinkableContentNodeDTO, QuestionDTO } from '@DTOs/index';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ContentLinkerService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Creates a linked content node.
   *
   * @param contentNode - The linkable content node DTO.
   * @returns An observable of the created linkable content node DTO.
   */
  createLinkedContentNode(contentNode: LinkableContentNodeDTO): Observable<LinkableContentNodeDTO> {
    return this.http.post<LinkableContentNodeDTO>(
      environment.server + '/content/linker/createLinkedContentNode',
      contentNode,
    );
  }

  /**
   * Creates a linked question.
   *
   * @param linkableQuestion - The linkable question to create.
   * @returns An observable of type `QuestionDTO` representing the created question.
   */
  createLinkedContentElement(
    linkableContentElement: LinkableContentElementDTO,
  ): Observable<LinkableContentElementDTO> {
    return this.http.post<LinkableContentElementDTO>(
      environment.server + '/content/linker/createLinkedContentElement',
      linkableContentElement,
    );
  }

  /**
   * Unlinks a content element by its ID.
   *
   * @param contentElementId - The ID of the content element to unlink.
   * @returns An Observable that emits a boolean indicating the success of the operation.
   */
  unlinkContentElement(contentElementId: number): Observable<boolean> {
    return this.http.get<boolean>(
      environment.server + '/content/linker/unlinkContentElement/' + contentElementId,
    );
  }

  /**
   * Fetches a list of unlinked questions from the server.
   *
   * @returns An Observable that emits an array of QuestionDTO objects representing the unlinked questions.
   */
  getUnlinkedQuestions(): Observable<QuestionDTO[]> {
    return this.http.get<QuestionDTO[]>(environment.server + '/content/linker/unlinkedQuestions');
  }

  /**
   * Updates the position of a content node.
   *
   * @param contentNodeId - The ID of the content node to update.
   * @param newPosition - The new position for the content node.
   * @returns An Observable that emits a boolean indicating the success of the operation.
   */
  updateContentNodePosition(contentNodeId: number, newPosition: number): Observable<boolean> {
    return this.http.get<boolean>(
      `${environment.server}/content/updatePosition/${contentNodeId}/${newPosition}`,
    );
  }

  updateContentViewVisibility(contentViewId: number, isVisible: boolean): Observable<boolean> {
    return this.http.put<boolean>(
      `${environment.server}/content/updateVisibility/${contentViewId}`,
      { isVisible },
    );
  }

  /**
   * Aktualisiert einen ContentNode (Name, Beschreibung, Level)
   */
  updateContentNode(
    contentNodeId: number,
    data: { name: string; description: string; difficulty: number },
  ): Observable<boolean> {
    return this.http.patch<boolean>(`${environment.server}/content/update/${contentNodeId}`, data);
  }
}

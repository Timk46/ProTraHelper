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

  /**
   * Updates the positions of content elements within a specified content node.
   *
   * Sends a PUT request to the server to update the order of elements based on the provided array of element IDs.
   *
   * @param contentNodeId - The ID of the content node whose elements' positions are to be updated.
   * @param orderedElementIds - An array of element IDs representing the new order of the elements.
   * @returns An Observable that emits `true` if the update was successful, otherwise `false`.
   */
  updateContentElementPositions(
    contentNodeId: number,
    orderedElementIds: number[],
  ): Observable<boolean> {
    return this.http.put<boolean>(
      `${environment.server}/content/updateElementPosition/${contentNodeId}/`,
      { positionedElementIds: orderedElementIds },
    );
  }

  /**
   * Updates the visibility status of a specific content view.
   *
   * Sends an HTTP PUT request to the server to update the visibility of the content view
   * identified by the provided `contentViewId`.
   *
   * @param contentViewId - The unique identifier of the content view to update.
   * @param isVisible - A boolean indicating whether the content view should be visible.
   * @returns An Observable that emits a boolean indicating the success of the update operation.
   */
  updateContentViewVisibility(contentViewId: number, isVisible: boolean): Observable<boolean> {
    return this.http.put<boolean>(
      `${environment.server}/content/updateVisibility/contentView/${contentViewId}`,
      { isVisible },
    );
  }

  /**
   * Updates the visibility status of a specific content node associated with a concept node.
   *
   * @param conceptNodeId - The ID of the concept node related to the content node.
   * @param contentNodeId - The ID of the content node whose visibility is to be updated.
   * @param isVisible - A boolean indicating whether the content node should be visible.
   * @returns An Observable that emits a boolean indicating the success of the update operation.
   */
  updateContentNodeVisibility(
    conceptNodeId: number,
    contentNodeId: number,
    isVisible: boolean,
  ): Observable<boolean> {
    return this.http.put<boolean>(
      `${environment.server}/content/updateVisibility/contentNode/${conceptNodeId}/${contentNodeId}`,
      { isVisible },
    );
  }

  /**
   * Updates a content node with the specified data.
   *
   * Sends a PATCH request to the server to update the content node identified by `contentNodeId`
   * with the provided `name`, `description`, and `difficulty`.
   *
   * @param contentNodeId - The unique identifier of the content node to update.
   * @param data - An object containing the updated properties:
   *   - `name`: The new name for the content node.
   *   - `description`: The new description for the content node.
   *   - `difficulty`: The new difficulty level for the content node.
   * @returns An Observable that emits `true` if the update was successful, otherwise `false`.
   */
  updateContentNode(
    contentNodeId: number,
    data: { name: string; description: string; difficulty: number },
  ): Observable<boolean> {
    return this.http.patch<boolean>(`${environment.server}/content/update/${contentNodeId}`, data);
  }
}

import {
  AnonymousUserDTO,
  discussionCreationDTO,
  discussionMessageCreationDTO,
  discussionNodeNamesDTO,
} from '@DTOs/index';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DiscussionCreationService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Returns the anonymous user for the logged in user by discussion id
   * @param discussionId
   * @returns Observable<AnonymousUserDTO>
   */
  getAnonymousUser(discussionId: number): Observable<AnonymousUserDTO> {
    return this.http.get<AnonymousUserDTO>(
      environment.server + `/discussion/creation/anonymousUser/${discussionId}`,
    );
  }

  /**
   * Creates a new discussion message in the database and returns it
   * @param message
   * @returns Observable<discussionMessageCreationDTO>
   */
  createDiscussionMessage(
    message: discussionMessageCreationDTO,
  ): Observable<discussionMessageCreationDTO> {
    return this.http.post<discussionMessageCreationDTO>(
      environment.server + '/discussion/creation/messages/create',
      message,
    );
  }

  /**
   * Creates a new discussion in the database and returns it
   * @param discussion
   * @returns Observable<number>
   */
  createDiscussion(discussion: discussionCreationDTO): Observable<number> {
    return this.http.post<number>(environment.server + '/discussion/creation/create', discussion);
  }

  /**
   * Returns the names of the concept node, content node and content element for the related ids
   * @param conceptNodeId
   * @param contentNodeId
   * @param contentElementId
   * @returns
   */
  getNodeNames(
    conceptNodeId: number,
    contentNodeId: number,
    contentElementId: number,
  ): Observable<discussionNodeNamesDTO> {
    return this.http.get<discussionNodeNamesDTO>(
      environment.server +
        `/discussion/creation/nodeNames/${conceptNodeId}/${contentNodeId}/${contentElementId}`,
    );
  }
}

import { discussionDTO, discussionMessageDTO, nodeNameDTO } from '@DTOs/index';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DiscussionViewService {

  constructor(private http: HttpClient) { }

  /** Returns the name of the concept node for a given discussion
   *
   * @param discussionId
   * @returns the name of the concept node
   */
  getConceptNodeName(discussionId: number) : Observable<nodeNameDTO> {
    return this.http.get<nodeNameDTO>(environment.server + `/discussion/view/conceptNodeName/${discussionId}`)
  }

  /**
   * This function returns a discussion for a given id
   * @param discussionId
   * @returns the discussion
   */
  getDiscussion(discussionId: number) : Observable<discussionDTO> {
    return this.http.get<discussionDTO>(environment.server + `/discussion/view/${discussionId}`)
  }

  /**
   * This function returns all messages for a given discussion
   * @param discussionId
   * @returns the messages
   */
  getMessages(discussionId: number) : Observable<discussionMessageDTO[]> {
    return this.http.get<discussionMessageDTO[]>(environment.server + `/discussion/view/messages/${discussionId}`)
  }
}

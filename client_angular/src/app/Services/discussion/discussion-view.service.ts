import { discussionDTO, discussionMessageDTO, nodeNameDTO } from '@DTOs/index';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject, tap } from 'rxjs';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DiscussionViewService {

  public toggleStatus: Subject<{messageId: number, isSolution: boolean}> = new Subject<{messageId: number, isSolution: boolean}>();

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

  /**
   * Toggles the solution status of a message and returns and sets the solution status of the discussion
   * @param messageId
   * @returns the new solution status as boolean
   */
  toggleSolution(messageId: number) : Observable<boolean> {
    //console.log('DiscussionViewService: toggleSolution')
    return this.http.get<boolean>(environment.server + `/discussion/view/messages/toggleSolution/${messageId}`)
      .pipe(
        tap((toggleStatus: boolean) => {
          this.toggleStatus.next({messageId: messageId, isSolution: toggleStatus});
        })
      );
  }


}

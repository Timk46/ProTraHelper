import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

import { discussionMessageVoteDTO } from '@DTOs/discussionMessageVote.dto';
import { discussionDTO, discussionsDTO, nodeNameDTO } from '@DTOs/discussion.dto';
import { discussionMessagesDTO } from '@DTOs/discussionMessage.dto';

import { Observable } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class DiscussionDataService {

  constructor(private http:HttpClient) { }

  /**
   * This function returns the vote data for a given message
   * @param messageId 
   * @returns the vote data
   */
  getVoteData(messageId: number) : Observable<discussionMessageVoteDTO> {
    return this.http.get<discussionMessageVoteDTO>(environment.server + `/discussion/votes/${messageId}`)
  }

  /** Returns all discussions for a given concept node and optional content node, author, solved status and search string
   * 
   * @param conceptNodeId 
   * @param contentNodeId 
   * @param onlySolved 
   * @param authorId 
   * @param searchString 
   * @returns the discussions
   */
  getDiscussions(conceptNodeId: number, contentNodeId: number, onlySolved: boolean, authorId: number, searchString: string) : Observable<discussionsDTO> {
    return this.http.get<discussionsDTO>(environment.server + `/discussion/list/${conceptNodeId}/${contentNodeId}/${onlySolved}/${authorId}/${searchString}`)
  }

  /**
   * This function returns a discussion for a given id
   * @param discussionId 
   * @returns the discussion
   */
  getDiscussion(discussionId: number) : Observable<discussionDTO> {
    return this.http.get<discussionDTO>(environment.server + `/discussion/${discussionId}`)
  }

  /**
   * This function returns all messages for a given discussion
   * @param discussionId 
   * @returns the messages
   */
  getMessages(discussionId: number) : Observable<discussionMessagesDTO> {
    return this.http.get<discussionMessagesDTO>(environment.server + `/discussion/messages/${discussionId}`)
  }

  /** Returns the name of the concept node for a given discussion
   * 
   * @param discussionId 
   * @returns the name of the concept node
   */
  getConceptNodeName(discussionId: number) : Observable<nodeNameDTO> {
    return this.http.get<nodeNameDTO>(environment.server + `/discussion/conceptNodeName/${discussionId}`)
  }

}

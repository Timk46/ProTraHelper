import { discussionMessageVoteCreationDTO, discussionMessageVoteDTO } from '@DTOs/index';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DiscussionVoteService {

  constructor(private http: HttpClient) { }

  /**
   * This function returns the vote data for a given message
   * @param messageId
   * @returns the vote data
   */
  getVoteData(messageId: number, userId: number) : Observable<discussionMessageVoteDTO> {
    return this.http.get<discussionMessageVoteDTO>(environment.server + `/discussion/vote/${messageId}/${userId}`)
  }

  /**
   * This function creates or modifies a vote
   * @param voteCreationData
   * @returns discussionMessageVoteCreationDTO
   */
  createOrModifyVote(voteCreationData: discussionMessageVoteCreationDTO) : Observable<discussionMessageVoteCreationDTO>{
    return this.http.post<discussionMessageVoteCreationDTO>(environment.server + '/discussion/vote/create', voteCreationData);
  }


}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AnonymousUserDTO, discussionCreationDTO, discussionMessageCreationDTO, discussionMessageVoteCreationDTO } from '@DTOs/index';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DiscussionCreationService {

  constructor(private http:HttpClient) { }

  getAnonymousUser(userId: number, discussionId: number) : Observable<AnonymousUserDTO>{
    return this.http.get<AnonymousUserDTO>(environment.server + `/discussion/anonymousUser/${userId}/${discussionId}`);
  }

  getAnonymousUserByMessageId(userId: number, messageId: number) : Observable<AnonymousUserDTO>{
    return this.http.get<AnonymousUserDTO>(environment.server + `/discussion/anonymousUserByMessageId/${userId}/${messageId}`);
  }

  createOrModifyVote(voteCreationData: discussionMessageVoteCreationDTO) : Observable<discussionMessageVoteCreationDTO>{
    return this.http.post<discussionMessageVoteCreationDTO>(environment.server + '/discussion/votes/create', voteCreationData);
  }

  createDiscussionMessage(message: discussionMessageCreationDTO): Observable<discussionMessageCreationDTO> {
    return this.http.post<discussionMessageCreationDTO>(environment.server + '/discussion/messages/create', message);
  }

  createAnonymousUser(userId: number, name: string): Observable<AnonymousUserDTO>{
    return this.http.post<AnonymousUserDTO>(environment.server + '/discussion/anonymousUser/create', {userId: userId, name: name});
  }

  createDiscussion(discussion: discussionCreationDTO): Observable<discussionCreationDTO> {
    return this.http.post<discussionCreationDTO>(environment.server + '/discussion/create', discussion);
  }


}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AnonymousUserDTO } from '@DTOs/user.dto';
import { Observable } from 'rxjs';
import { discussionMessageDTO } from '@DTOs/discussionMessage.dto';
import { creationResponseDTO, discussionCreationDTO, discussionMessageCreationDTO } from '@DTOs/discussionCreation.dto';

@Injectable({
  providedIn: 'root'
})
export class CreationService {

  constructor(private http:HttpClient) { }

  getAnonymousUser(userId: number, discussionId: number) : Observable<AnonymousUserDTO>{
    return this.http.get<AnonymousUserDTO>(environment.server + `/discussion/anonymousUser/${userId}/${discussionId}`);
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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AnonymousUserDTO } from '@DTOs/user.dto';
import { Observable } from 'rxjs';
import { discussionMessageDTO } from '@DTOs/discussionMessage.dto';
import { creationResponseDTO } from '@DTOs/discussionCreation.dto';

@Injectable({
  providedIn: 'root'
})
export class CreationService {

  constructor(private http:HttpClient) { }

  getAnonymousUser(userId: number, discussionId: number) : Observable<AnonymousUserDTO>{
    return this.http.get<AnonymousUserDTO>(environment.server + `/discussion/anonymousUser/${userId}/${discussionId}`);
  }

  createDiscussionMessage(message: discussionMessageDTO): Observable<creationResponseDTO> {
    console.log("CreationService: createDiscussionMessage, message:");
    console.log(message);
    return this.http.post<creationResponseDTO>(environment.server + '/discussion/messages/create', message);
  }


}

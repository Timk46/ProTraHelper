import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

import { discussionMessageVoteDTO } from '@DTOs/discussionMessageVote.dto';
import { Observable } from 'rxjs';
import { discussionsDTO } from '@DTOs/discussion.dto';


@Injectable({
  providedIn: 'root'
})
export class DiscussionDataService {

  constructor(private http:HttpClient) { }

  getVoteData(messageId: number) : Observable<discussionMessageVoteDTO> {
    return this.http.get<discussionMessageVoteDTO>(environment.server + `/discussion/votes/${messageId}`)
  }

  getDiscussions(conceptNodeId: number, contentNodeId: number, onlySolved: boolean, authorId: number, searchString: string) : Observable<discussionsDTO> {
    return this.http.get<discussionsDTO>(environment.server + `/discussion/${conceptNodeId}/${contentNodeId}/${onlySolved}/${authorId}/${searchString}`)
  }

}

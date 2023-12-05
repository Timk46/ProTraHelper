import { AnonymousUserDTO, discussionCreationDTO, discussionMessageCreationDTO, discussionNodeNamesDTO } from '@DTOs/index';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DiscussionCreationService {

  constructor(private http:HttpClient) { }

  /**
   * Returns the anonymous user for the logged in user by discussion id
   * @param userId
   * @param discussionId
   * @returns Observable<AnonymousUserDTO>
   */
  getAnonymousUser(discussionId: number) : Observable<AnonymousUserDTO>{
    return this.http.get<AnonymousUserDTO>(environment.server + `/discussion/creation/anonymousUser/${discussionId}`);
  }

  /**
   * Creates a new anonymous user in the database and returns it
   * @param userId
   * @param name
   * @returns Observable<AnonymousUserDTO>
   */
  createAnonymousUser(name: string = ''): Observable<AnonymousUserDTO>{
    const funnyWords: string[] = ["Narwal", "Quokka", "Axolotl", "Blobfisch", "Pangolin", "Wombat", "Kakapo", "Fuchskusu", "Gibbon", "Tapir", "Schnabeltier", "Alpaka", "Koala", "Lemming", "Marmelade", "Muffin", "Pudding", "Schokolade", "Zimtstern", "Donut", "Einhorn", "Flamingo", "Giraffe", "Hummel", "Igel", "Jaguar", "Kolibri", "Lama", "Maulwurf", "Nashorn", "Otter", "Pinguin", "Qualle", "Raubkatze", "Seestern", "Tukan", "Uhu", "Vogelspinne", "Yak", "Zebra"];
    let nameString: string = name;
    if (name === '') {
      nameString = funnyWords[Math.floor(Math.random() * funnyWords.length)] + 's ' + funnyWords[Math.floor(Math.random() * funnyWords.length)];
    }
    return this.http.post<AnonymousUserDTO>(environment.server + '/discussion/creation/anonymousUser/create', {name: name? name : nameString});
  }

  /**
   * Creates a new discussion message in the database and returns it
   * @param message
   * @returns Observable<discussionMessageCreationDTO>
   */
  createDiscussionMessage(message: discussionMessageCreationDTO): Observable<discussionMessageCreationDTO> {
    return this.http.post<discussionMessageCreationDTO>(environment.server + '/discussion/creation/messages/create', message);
  }

  /**
   * Creates a new discussion in the database and returns it
   * @param discussion
   * @returns Observable<discussionCreationDTO>
   */
  createDiscussion(discussion: discussionCreationDTO): Observable<discussionCreationDTO> {
    return this.http.post<discussionCreationDTO>(environment.server + '/discussion/creation/create', discussion);
  }

  /**
   * Returns the names of the concept node, content node and content element for the related ids
   * @param conceptNodeId
   * @param contentNodeId
   * @param contentElementId
   * @returns
   */
  getNodeNames(conceptNodeId: number, contentNodeId: number, contentElementId: number) : Observable<discussionNodeNamesDTO> {
    return this.http.get<discussionNodeNamesDTO>(environment.server + `/discussion/creation/nodeNames/${conceptNodeId}/${contentNodeId}/${contentElementId}`)
  }
}

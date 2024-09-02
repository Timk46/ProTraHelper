import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LinkableContentElementDTO, LinkableContentNodeDTO } from '@DTOs/index';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContentLinkerService {

  constructor(private http: HttpClient) { }


  /**
   * Creates a linked content node.
   *
   * @param contentNode - The linkable content node DTO.
   * @returns An observable of the created linkable content node DTO.
   */
  createLinkedContentNode(contentNode: LinkableContentNodeDTO): Observable<LinkableContentNodeDTO> {
    return this.http.post<LinkableContentNodeDTO>(environment.server + '/content/linker/createLinkedContentNode', contentNode);
  }

  /**
   * Creates a linked question.
   *
   * @param linkableQuestion - The linkable question to create.
   * @returns An observable of type `QuestionDTO` representing the created question.
   */
  createLinkedContentElement(linkableContentElement: LinkableContentElementDTO): Observable<LinkableContentElementDTO> {
    return this.http.post<LinkableContentElementDTO>(environment.server + '/content/linker/createLinkedContentElement', linkableContentElement);
  }


}

import { discussionDTO, discussionFilterContentNodeDTO, discussionFilterDTO } from '@DTOs/index';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DiscussionListService {

  constructor(private http: HttpClient) { }

  /**
   * Returns a list of discussions with the given filter data
   * @param filterData
   * @returns discussionDTO[]
   */
  getDiscussions(filterData: discussionFilterDTO): Observable<discussionDTO[]> {
    return this.http.post<discussionDTO[]>(environment.server + `/discussion/list/`, filterData);
  }

  /**
   * Returns a list of content nodes that are trained by the given concept node - used for the filter
   * @param conceptNodeId
   * @returns discussionFilterContentNodeDTO[]
   */
  getFilterContentNodes(conceptNodeId: number): Observable<discussionFilterContentNodeDTO[]> {
    return this.http.get<discussionFilterContentNodeDTO[]>(environment.server + `/discussion/list/filterContentNodes/${conceptNodeId}`);
  }


}

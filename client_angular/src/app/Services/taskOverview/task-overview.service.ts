import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaskOverviewService {

  constructor(private http: HttpClient) { }

  getTaskIdsForConceptNode(conceptNodeId: Number) : Observable<Number[]>{
    console.log('given conceptNodeID for task-overview-service: ' + conceptNodeId);
    return this.http.get<Number[]>(environment.server + `/task-overview/${conceptNodeId}`);
  }

  /**
   * Returns the marginal task identity data for a given concept node id to be able to open the right task dialog
   * @param conceptNodeId 
   * @returns {id: number, type: string}
   */
  getTaskIdentityDataForConceptNode(conceptNodeId: Number) : Observable<{id: number, type: string}[]>{
    console.log('given conceptNodeID for task-overview-service: ' + conceptNodeId);
    return this.http.get<{id: number, type: string}[]>(environment.server + `/task-overview/taskIdentitys/${conceptNodeId}`);
  }
}

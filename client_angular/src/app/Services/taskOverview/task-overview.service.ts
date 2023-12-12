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
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { taskOverviewElementDTO } from '@DTOs/taskOverview.dto';

@Injectable({
  providedIn: 'root'
})
export class TaskOverviewService {

  constructor(private http: HttpClient) { }

  /**
   * Returns the marginal task identity data for a given concept node id to be able to open the right task dialog
   * @param conceptNodeId 
   * @returns {id: number, type: string}
   */
  getTaskOverviewData(questionId: number) : Observable<taskOverviewElementDTO>{
    return this.http.get<taskOverviewElementDTO>(environment.server + `/task-overview/${questionId}`);
  }
}

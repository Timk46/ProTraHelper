import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { ConceptGraph } from '@Interfaces/index';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GraphDataService {

  constructor(private http: HttpClient) { }

  /**
   * Fetches the graph for a specific user
   * with the user's progress
   * @param userId The id of the user
   * @returns The graph for the user
   */
  fetchUserGraph(userId: number): Observable<ConceptGraph> {
    return this.http.get<ConceptGraph>(environment.server + `/graph/${userId}`)
  }



  /**
   * Creates a new concept node and returns it
   * @param parentId The id of the parent concept
   * @param conceptName The name of the new concept
   * @returns The new concept node
   */
  createConcept(parentId: string, conceptName: string) {
  }

  /**
   * Creates a new edge between two concepts, if it doesn't already exist
   * @param parentId The id of the parent concept (usually the parent of the connected concepts)
   * @param prerequisite The id of the prerequisite concept
   * @param successor The id of the successor concept
   * @returns The new edge
   */
  createEdge(parentId: string, prerequisiteId: string, successorId: string) {

  }

  updateUserConceptData(userId: number, conceptId: number, data?: any) {
    console.log("in updateUserConceptData: ", data)
    return this.http.put(environment.server + `/graph/userConcept/${userId}/${conceptId}`, data)
  }

}

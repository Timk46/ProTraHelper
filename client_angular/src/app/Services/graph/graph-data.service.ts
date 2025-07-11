import type { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import type { ConceptGraphDTO } from '@DTOs/index';
import type { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GraphDataService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetches the graph for a specific user
   * with the user's progress
   * @param moduleId The id of the module (for the concept goals)
   * @returns The graph for the user
   */
  fetchUserGraph(moduleId: number): Observable<ConceptGraphDTO> {
    return this.http.get<ConceptGraphDTO>(environment.server + `/graph/${moduleId}`);
  }

  /**
   * Creates a new concept node and returns it
   * @param parentId The id of the parent concept
   * @param conceptName The name of the new concept
   * @returns The new concept node
   */
  createConcept(
    parentId: string,
    conceptName: string,
    description?: string,
    moduleGoals?: { moduleId: number; goal: number }[],
  ) {
    //console.log("in graph-data.service. Trying to create concept: ", parentId, conceptName)
    const x = this.http
      .post(environment.server + `/graph/concept/${parentId}/${conceptName}`, {
        description: description,
        moduleGoals: moduleGoals,
      })
      .subscribe();
    //console.log("x: ", x)
    return x;
  }

  /**
   * Deletes a concept node if it has no children
   * @param conceptId The id of the concept node
   * @returns The deleted concept node
   * @throws Will throw an error if the concept node has children
   */
  deleteConcept(conceptId: number) {
    //console.log("trying to delete node with id: ", conceptId)
    return this.http.delete(environment.server + `/graph/concept/${conceptId}`);
  }

  /**
   * Creates a new edge between two concepts, if it doesn't already exist
   * @param parentId The id of the parent concept (usually the parent of the connected concepts)
   * @param prerequisite The id of the prerequisite concept
   * @param successor The id of the successor concept
   * @returns The new edge
   */
  createEdge(parentId: number, prerequisiteId: number, successorId: number) {
    //console.log("in createEdge: ", parentId, prerequisiteId, successorId)
    return this.http.post(environment.server + `/graph/edge`, {
      parentId: parentId,
      prerequisiteId: prerequisiteId,
      successorId: successorId,
    });
  }

  deleteEdge(edgeId: number) {
    //console.log("in deleteEdge: ", edgeId)
    return this.http.delete(environment.server + `/graph/edge/${edgeId}`);
  }

  moveConceptNode(conceptId: number, parentId: number) {
    //console.log("in moveConcept: ", conceptId, parentId)
    return this.http.put(
      environment.server + `/graph/concept/${conceptId}/newParent/${parentId}`,
      {},
    );
  }

  updateUserLevel(conceptId: number, level: number) {
    //console.log("in updateUserLevel: ", level)
    return this.http.put(environment.server + `/user-concept/${conceptId}/level/${level}`, {});
  }

  updateSelectedConcept(conceptId: number) {
    return this.http.put(environment.server + `/user-concept/concept/${conceptId}/selected`, {});
  }

  updateConceptExpansionState(conceptId: number, expanded: boolean) {
    return this.http.put(
      environment.server + `/user-concept/${conceptId}/expanded/${expanded}`,
      {},
    );
  }
}

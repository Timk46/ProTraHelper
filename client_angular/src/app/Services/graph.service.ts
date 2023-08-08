import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GraphService {

  constructor() { }

  /**
   * Fetches the full graph from the server
   */
  fetchFullGraph() {
  }

  /**
   * Fetches the graph for a specific user
   * with the user's progress
   * @param userId The id of the user
   * @returns The graph for the user
   */
  fetchUserGraph(userId: number) {
  
  }

  /**
   * Creates a new concept node and returns it
   * @param parentId The id of the parent concept
   * @param conceptName The name of the new concept
   * @returns The new concept node
   */
  createConcept(parentId: number, conceptName: string) {
  }

  /**
   * Creates a new edge between two concepts, if it doesn't already exist
   * @param parentId The id of the parent concept (usually the parent of the connected concepts)
   * @param prerequisite The id of the prerequisite concept
   * @param successor The id of the successor concept
   * @returns The new edge
   */
  createEdge(parentId: number, prerequisite: number, successor: number) {
  
  }
  
}

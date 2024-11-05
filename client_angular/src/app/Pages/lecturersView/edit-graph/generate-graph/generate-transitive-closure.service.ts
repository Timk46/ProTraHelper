import { Injectable } from '@angular/core';
import { GenerateGraphService } from './generate-graph.service';
import { GraphEdgeDTO, GraphStructureDTO } from '@DTOs/graphTask.dto';

@Injectable({
  providedIn: 'root'
})
export class GenerateTransitiveClosureService {

  constructor(private generateGraphService: GenerateGraphService) { }

  generate(): GraphStructureDTO {

    const {nodes, edges} = this.generateGraphService.generateGraph({
      nodesCount: 5,
      edgesCount: 5,
      selfEdges: true,
      edgeDirected: true,
      edgeWeight: false,
      nodeWeight: false,
      nodeSelected: false,
    });

    const updatedEdges: GraphEdgeDTO[] = []; 
    
    edges.forEach(edge => {
      updatedEdges.push({
        node1Id: edge.node1.nodeId,
        node2Id: edge.node2.nodeId,
        weight: edge.weight || undefined
    })
    });

    return { nodes, edges: updatedEdges };
  }
}

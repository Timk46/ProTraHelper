import { Injectable } from '@angular/core';
import { GenerateGraphService } from './generate-graph.service';
import { GraphEdgeDTO, GraphStructureDTO } from '@DTOs/graphTask.dto';

export interface GenerateTransitiveClosureConfiguration {
  nodesCount: number,
  edgesCount: number,
  maxSelfEdges: number
}

@Injectable({
  providedIn: 'root'
})
export class GenerateTransitiveClosureService {

  constructor(private generateGraphService: GenerateGraphService) { }

  generate( configuration: GenerateTransitiveClosureConfiguration ): GraphStructureDTO {

    const {nodes, edges} = this.generateGraphService.generateGraph({
      ...configuration,
      edgeDirected: true,
      edgeWeight: {
        enabled: false,
        min: 0,
        max: 0
      },
      nodeWeight: {
        enabled: false,
        min: 0,
        max: 0
      },
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

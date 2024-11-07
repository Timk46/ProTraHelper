import { Injectable } from '@angular/core';
import { GenerateGraphService } from './generate-graph.service';
import { GraphEdgeDTO, GraphStructureDTO } from '@DTOs/graphTask.dto';

export interface GenerateKruskalConfiguration {
  nodesCount: number,
  edgesCount: number,
  edgeWeight: {
    enabled: true,
    min: number,
    max: number
  },
}


@Injectable({
  providedIn: 'root'
})
export class GenerateKruskalService {

  constructor(private generateGraphService: GenerateGraphService) { }

  generate(configuration: GenerateKruskalConfiguration): GraphStructureDTO {
    
    if (configuration.nodesCount < 1) {
      throw new Error('Number of nodes must be at least 1');
    }

    if (configuration.edgesCount < configuration.nodesCount - 1) {
      throw new Error('Number of edges must be at least number of nodes - 1');
    }

    if (configuration.edgeWeight.min > configuration.edgeWeight.max) {
      throw new Error('Min edge weight cannot be less than max edge weight');
    }

    const _configuration = {
      ...configuration,
      maxSelfEdges: 0,
      edgeDirected: false,
      nodeSelected: false,
      nodeWeight: {
        enabled: false,
        min: 0,
        max: 0
      },

    }

    const {nodes, edges} = this.generateGraphService.generateGraph(_configuration);
   
    const updatedEdges: GraphEdgeDTO[] = []; 
    
    edges.forEach(edge => {
      updatedEdges.push({
        node1Id: edge.node1.nodeId,
        node2Id: edge.node2.nodeId,
        weight: edge.weight,
    })
    });

    return { nodes, edges: updatedEdges };
  }

}

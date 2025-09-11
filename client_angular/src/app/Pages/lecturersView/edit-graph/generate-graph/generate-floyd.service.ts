import { Injectable } from '@angular/core';
import { GenerateGraphService } from './generate-graph.service';
import { GraphEdgeDTO, GraphStructureDTO } from '@DTOs/index';

export interface GenerateFloydConfiguration {
  nodesCount: number;
  edgesCount: number;
  edgeWeight: {
    enabled: boolean;
    min: number;
    max: number;
  };
  maxSelfEdges: number;
}

@Injectable({
  providedIn: 'root',
})
export class GenerateFloydService {
  constructor(private readonly generateGraphService: GenerateGraphService) {}

  generate(configuration: GenerateFloydConfiguration): GraphStructureDTO {
    if (configuration.nodesCount < 1) {
      throw new Error('Number of nodes must be at least 1');
    }

    if (configuration.edgeWeight.min > configuration.edgeWeight.max) {
      throw new Error('Min edge weight cannot be less than max edge weight');
    }

    const { nodes, edges } = this.generateGraphService.generateGraph({
      ...configuration,
      edgeDirected: true,
      nodeWeight: {
        enabled: false,
        min: 0,
        max: 0,
      },
      nodeSelected: false,
    });

    const updatedEdges: GraphEdgeDTO[] = [];

    edges.forEach(edge => {
      updatedEdges.push({
        node1Id: edge.node1.nodeId,
        node2Id: edge.node2.nodeId,
        weight: configuration.edgeWeight.enabled ? edge.weight : null,
      });
    });

    return { nodes, edges: updatedEdges };
  }
}

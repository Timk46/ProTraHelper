import { Injectable } from '@angular/core';
import { GraphEdgeDTO, GraphNodeDTO, GraphStructureDTO } from '@DTOs/index';
import { GenerateGraphService } from './generate-graph.service';

export interface GenerateDijkstraConfiguration {
  nodesCount: number;
  edgesCount: number;
  edgeWeight: {
    enabled: true;
    min: number;
    max: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class GenerateDijkstraService {
  constructor(private readonly generateGraphService: GenerateGraphService) {}

  generate(configuration: GenerateDijkstraConfiguration): GraphStructureDTO {
    if (configuration.nodesCount < 1) {
      throw new Error('Number of nodes must be at least 1');
    }

    if (configuration.edgeWeight.min < 0 || configuration.edgeWeight.max < 0) {
      throw new Error('Edge weight cannot be negative');
    }

    if (configuration.edgeWeight.min > configuration.edgeWeight.max) {
      throw new Error('Min edge weight cannot be less than max edge weight');
    }

    const _configuration = {
      ...configuration,
      maxSelfEdges: 0,
      edgeDirected: false,
      nodeWeight: {
        // disabled, as it won't be generated randomly
        enabled: false,
        min: 0,
        max: 0,
      },
      nodeSelected: true, // It is enabled and the attribute selected will be set to false automatically for all nodes
    };

    const { nodes, edges } = this.generateGraphService.generateGraph(_configuration);

    // Randomly select a starting node for Dijkstra's algorithm
    const startNodeIndex = this.generateGraphService.getRandomNumber(
      0,
      configuration.nodesCount - 1,
    );
    const startNode = nodes[startNodeIndex];

    // TODO: Find a proper solution for this
    // For now, prevent the start node having an edge with weight 0
    // as it causes multiple nodes to have the weight 0
    // but for now we distinguish the start node by setting its weight to 0
    edges.forEach(edge => {
      if (edge.node1 === startNode && edge.weight === 0) {
        edge.weight = 1;
      }
      if (edge.node2 === startNode && edge.weight === 0) {
        edge.weight = 1;
      }
    });

    // Calculate initial state for Dijkstra's algorithm
    const updatedNodes = this.calculateInitialStateWithWeights(startNode, nodes, edges);

    const updatedEdges: GraphEdgeDTO[] = [];

    edges.forEach(edge => {
      updatedEdges.push({
        node1Id: edge.node1.nodeId,
        node2Id: edge.node2.nodeId,
        weight: edge.weight,
      });
    });

    return { nodes: updatedNodes, edges: updatedEdges };
  }

  // Function to calculate initial state for Dijkstra's algorithm
  calculateInitialStateWithWeights(startNode: GraphNodeDTO, nodes: GraphNodeDTO[], edges: any[]) {
    // Step 1: Initialize all node weights to Infinity except the start node
    nodes.forEach(node => {
      node.weight = Number.MAX_SAFE_INTEGER; // Initially set to a large number (Infinity)
    });
    startNode.weight = 0;

    edges.forEach(edge => {
      if (edge.node1 === startNode) {
        edge.node2.weight = edge.weight;
      }
      if (edge.node2 === startNode) {
        edge.node1.weight = edge.weight;
      }
    });

    // Return updated nodes with calculated weights for shortest paths
    return nodes;
  }
}

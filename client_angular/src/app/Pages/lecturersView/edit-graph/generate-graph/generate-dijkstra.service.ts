import { Injectable } from '@angular/core';
import { GraphEdgeDTO, GraphNodeDTO, GraphStructureDTO } from '@DTOs/graphTask.dto';
import { GenerateGraphService } from './generate-graph.service';

@Injectable({
  providedIn: 'root'
})
export class GenerateDijkstraService {

  constructor(private generateGraphService: GenerateGraphService) { }

  generate(): GraphStructureDTO {

    const configuration = {
      nodesCount: 5,
      edgesCount: 5,
      selfEdges: false,
      edgeDirected: false,
      edgeWeight: true,
      nodeWeight: false, // false as it won't be generated randomly
      nodeSelected: true, // It will be set to false automatically for all nodes
    }

    const {nodes, edges} = this.generateGraphService.generateGraph(configuration);
    
    // Randomly select a starting node for Dijkstra's algorithm
    const startNodeIndex = this.generateGraphService.getRandomNumber(0, configuration.nodesCount - 1);
    const startNode = nodes[startNodeIndex];

    // Calculate initial state for Dijkstra's algorithm
    const updatedNodes = this.calculateInitialStateWithWeights(startNode, nodes, edges);

    const updatedEdges: GraphEdgeDTO[] = []; 
    
    edges.forEach(edge => {
      updatedEdges.push({
        node1Id: edge.node1.nodeId,
        node2Id: edge.node2.nodeId,
        weight: edge.weight || undefined
    })
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
    })
    
    // Return updated nodes with calculated weights for shortest paths
    return nodes;
  }


}

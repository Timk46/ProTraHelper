import { Injectable } from '@angular/core';
import { GraphNodeDTO } from '@DTOs/graphTask.dto';

export interface GenerateGraphConfiguration {
  nodesCount: number,
  edgesCount: number,
  maxSelfEdges: number,
  edgeDirected: boolean,
  edgeWeight: {
    enabled: boolean,
    min: number,
    max: number,
  },
  nodeWeight: {
    enabled: boolean,
    min: number,
    max: number,
  },
  nodeSelected: boolean,
}

@Injectable({
  providedIn: 'root'
})
export class GenerateGraphService {

  constructor() { }
    
  generateGraph(configuration : GenerateGraphConfiguration): { nodes: GraphNodeDTO[], edges: any[] } {
  
    // Generate nodes
    const nodes: GraphNodeDTO[] = []
    let nodeIndex = 0;
  
    while (nodeIndex < configuration.nodesCount) {
      const node = this.generateNode(nodeIndex, configuration);
      nodes.push(node);
      nodeIndex++;
    }
    
    // Generate edges
    const edges = this.generateEdges(nodes, configuration);
  
    return {
      nodes,
      edges
    }
  }

  generateNode(
    nodeIndex: number,
    configuration: GenerateGraphConfiguration
  ): GraphNodeDTO {
  
    // Generate node
    const nodeValue = this.generateNodeValue(nodeIndex)
    const {
      nodePosition, nodeSize, nodeCenter
    } = this.generateNodeGeometry(nodeIndex, configuration.nodesCount);
  
    const node: any = {
      nodeId: nodeIndex,
      value: nodeValue,
      position: nodePosition,
      size: nodeSize,
      center: nodeCenter
    }
  
    // Generate optional attributes according to the configuration
    if (configuration.nodeWeight) {
      node.weight = this.getRandomNumber(configuration.nodeWeight.min, configuration.nodeWeight.max) // generate random number
    }
  
    if (configuration.nodeSelected) {
      node.selected = false;
    }
  
    return node; 
  }
  
  generateEdges(
    nodes: GraphNodeDTO[], 
    configuration: GenerateGraphConfiguration
  ) {
  
    const edges: any[] = [];
    let edgeIndex = 0;
    let selfEdgesCounter = 0;

    while (edgeIndex < configuration.edgesCount) {
  
      let node1Index = 0 //generate random number between 0 - nodes.length - 1
      let node2Index = 0 //generate random number between 0 - nodes.length - 1
      let sameEdge = 0;
   
      while (sameEdge !== undefined) {
  
        node1Index = this.getRandomNumber(0, nodes.length - 1);
        node2Index = this.getRandomNumber(0, nodes.length - 1);

        if (node1Index === node2Index) {
          if (selfEdgesCounter >= configuration.maxSelfEdges) { continue; }
        }
  
        if (configuration.edgeDirected) {
          sameEdge = edges.find(edge => (edge.node1 === nodes[node1Index] && edge.node2 === nodes[node2Index]))
        }
        else if (!configuration.edgeDirected) {
          sameEdge = edges.find(edge => 
          (
          (edge.node1 === nodes[node1Index] && edge.node2 === nodes[node2Index]) ||
          (edge.node1 === nodes[node2Index] && edge.node2 === nodes[node1Index])
          )
        )}
      }

      if (node1Index === node2Index) { 
        selfEdgesCounter++;
      }
  
      const edge: any = {
        node1: nodes[node1Index],
        node2: nodes[node2Index]
      }
  
      if (configuration.edgeWeight.enabled) {
        edge.weight = this.getRandomNumber(configuration.edgeWeight.min, configuration.edgeWeight.max) // Generate random weight
      }
  
      edges.push(edge);
      edgeIndex++;
    }
  
    return edges;
  }

  generateNodeGeometry(nodeIndex: number, nodesCount: number) {
    
    const nodeSize = { width: 100, height: 100 };
    const positionOffset = { x: 50, y: 50 };
    const distance = 100;
    
    const halfNodesCount = Math.floor(nodesCount / 2);
    
    const nodePosition = {
      x: positionOffset.x + ( Math.floor(nodeIndex / halfNodesCount) * (nodeSize.width + distance) ),
      y: positionOffset.y + ( Math.floor(nodeIndex % halfNodesCount) * (nodeSize.width + distance) ) // using positionOffset.y for vertical spacing
    };

    const nodeCenter = {
      x: nodePosition.x + nodeSize.width / 2,
      Y: nodePosition.y + nodeSize.height / 2,
    }
    
    return {
      nodePosition, nodeSize, nodeCenter
    }
  }


  generateNodeValue(index: number): string {
    let result = '';
    let current = index;
  
    // Loop through alphabet until we reach the target index
    while (current >= 0) {
      result = String.fromCharCode((current % 26) + 65) + result;
      current = Math.floor(current / 26) - 1;
    }
    return result;
  }


  getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

}

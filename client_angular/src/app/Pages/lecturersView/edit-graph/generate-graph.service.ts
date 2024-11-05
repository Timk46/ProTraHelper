import { Injectable } from '@angular/core';
import { GraphConfigurationDTO, GraphEdgeDTO, PositionDTO, SizeDTO } from '@DTOs/graphTask.dto';

@Injectable({
  providedIn: 'root'
})
export class GenerateGraphService {

  constructor() { }

  generateGraph(
    nodesCount: number,
    edgesCount: number,
    graphConfiguration: GraphConfigurationDTO
  ) {
  
  
    const nodes: any[] = []
    let nodeIndex = 0;
  
    while (nodeIndex < nodesCount) {
      const node = this.generateNode(nodeIndex, nodesCount, graphConfiguration);
      nodes.push(node);
      nodeIndex++;
    }
  
    const edges = this.generateEdges(nodes, edgesCount, graphConfiguration);
  
    return {
      nodes,
      edges
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

  generateNodeGeometry(nodeIndex: number, totalNodesCount: number) : {
    nodePosition: PositionDTO,
    nodeSize: SizeDTO,
    nodeCenter: PositionDTO
  }
   {
    
    const nodeSize = { width: 100, height: 100 };
    const positionOffset = { x: 50, y: 50 };
    const distance = 100;
    
    const halfNodesCount = Math.floor(totalNodesCount / 2);
    
    const nodePosition = {
      x: positionOffset.x + ( Math.floor(nodeIndex / halfNodesCount) * (nodeSize.width + distance) ),
      y: positionOffset.y + ( Math.floor(nodeIndex % halfNodesCount) * (nodeSize.width + distance) ) 
    };

    const nodeCenter = {
      x: nodePosition.x + nodeSize.width / 2,
      y: nodePosition.y + nodeSize.height / 2,
    }
    
    return {
      nodePosition, nodeSize, nodeCenter
    }
  }

  generateNode(
    nodeIndex: number,
    nodesCount: number,
    graphConfiguration: GraphConfigurationDTO
  ) {
  
    const nodeValue = this.generateNodeValue(nodeIndex)
    const {
      nodePosition, nodeSize, nodeCenter
    } = this.generateNodeGeometry(nodeIndex, nodesCount);
  
    const node: any = {
      nodeId: nodeIndex,
      value: nodeValue,
      position: nodePosition,
      size: nodeSize,
      center: nodeCenter
    }
  
    if (graphConfiguration.nodeWeight) {
      node.weight = this.getRandomNumber(0, 10) // generate random number
    }
  
    if (graphConfiguration.nodeSelected) {
      node.selected = false;
    }
  
    return node; 
  }
  
  generateEdges(
    nodes: any[], 
    edgesCount: number, 
    graphConfiguration: GraphConfigurationDTO
  ) {
  
    const edges: any[] = [];
    let edgeIndex = 0;
  
    while (edgeIndex < edgesCount) {
  
      let node1Index = 0;
      let node2Index = 0;
      let sameEdge = 0;
   
      while (sameEdge !== undefined) {
  
        node1Index = this.getRandomNumber(0, nodes.length - 1);
        node2Index = this.getRandomNumber(0, nodes.length - 1);
  
        if (graphConfiguration.edgeDirected) {
          sameEdge = edges.find(edge => (edge.node1 === nodes[node1Index] && edge.node2 === nodes[node2Index]))
        }
        else if (!graphConfiguration.edgeDirected) {
          sameEdge = edges.find(edge => 
          (
          (edge.node1 === nodes[node1Index] && edge.node2 === nodes[node2Index]) ||
          (edge.node1 === nodes[node2Index] && edge.node2 === nodes[node1Index])
          )
        )}
      }
  
      const edge: any = {
        node1: nodes[node1Index],
        node2: nodes[node2Index]
      }
  
      if (graphConfiguration.edgeWeight) {
        edge.weight = this.getRandomNumber(0, 10) // Generate random weight
      }
  
      edges.push(edge);
      edgeIndex++;
    }
  
    return edges;
  }

  getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateTransitiveClosureTask() {
    const {nodes, edges} = this.generateGraph(5, 5, {
      edgeDirected: true,
      edgeWeight: false,
      nodeWeight: false,
      nodeSelected: false,
      nodeSelectedText: { selected: 'Besucht', unselected: 'Nicht Besucht' }  
    });

    const edgesConverted: GraphEdgeDTO[] = []; 
    
    edges.forEach(edge => {
      edgesConverted.push({
        node1Id: edge.node1.nodeId,
        node2Id: edge.node2.nodeId,
        weight: edge.weight || undefined
    })
    });

    return {
      nodes, edges: edgesConverted
    }
  }

}

import { Injectable } from '@angular/core';
import { GenerateGraphService } from './generate-graph.service';
import { GraphEdgeDTO, GraphStructureDTO } from '@DTOs/graphTask.dto';

@Injectable({
  providedIn: 'root'
})
export class GenerateKruskalService {

  constructor(private generateGraphService: GenerateGraphService) { }

  generate(): GraphStructureDTO {

    const configuration = {
      nodesCount: 5,
      edgesCount: 5,
      selfEdges: false,
      edgeDirected: false,
      edgeWeight: true,
      nodeWeight: false,
      nodeSelected: false,
    }

    const {nodes, edges} = this.generateGraphService.generateGraph(configuration);
   
    const updatedEdges: GraphEdgeDTO[] = []; 
    
    edges.forEach(edge => {
      updatedEdges.push({
        node1Id: edge.node1.nodeId,
        node2Id: edge.node2.nodeId,
        weight: edge.weight || 1,
    })
    });

    return { nodes, edges: updatedEdges };
  }

}

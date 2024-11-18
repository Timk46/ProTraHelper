import { Injectable } from '@nestjs/common';
import { TransitiveClosureService } from '../transitive-closure/transitive-closure.service';
import { graphJSONToSemantic } from '../utils/graph-utils';
import { GraphStructureDTO, GraphStructureSemanticDTO } from '@Interfaces/graphTask.dto';

@Injectable()
export class ExampleSolutionGenerationService {

  constructor (private readonly transitiveClosureService: TransitiveClosureService) {}

  generateTransitiveClosureExampleSolution(initialStructure: GraphStructureDTO): GraphStructureDTO[] {

    // Convert the initial structure to semantic representation
    const initialStructureSemantic = graphJSONToSemantic(initialStructure);

    // Solve the question (nodesOrder is not important for this task)
    const nodesOrder: string[] = initialStructureSemantic.nodes.map(node => node.value);
    const expectedSolutionSemantic: GraphStructureSemanticDTO = this.transitiveClosureService.solveTransitiveClosure(initialStructureSemantic, nodesOrder);

    // Convert the semantic solution back to JSON representation where we have attributes like position, id etc.
    expectedSolutionSemantic.edges.forEach(generatedEdgeSemantic => {

      // TODO: does it always match node1 to node1 and node2 to node2? 
      const node1Id = initialStructure.nodes.find(node => node.value == generatedEdgeSemantic.node1Value).nodeId;
      const node2Id = initialStructure.nodes.find(node => node.value == generatedEdgeSemantic.node2Value).nodeId;

      // Add new edges to the initial structure if it does not exist
      if (initialStructure.edges.find(initialEdge => initialEdge.node1Id === node1Id && initialEdge.node2Id === node2Id) == undefined) {
        initialStructure.edges.push({
          node1Id: node1Id,
          node2Id: node2Id,
          weight: null
        });
      }
    });

    return [initialStructure];
  }
  
}

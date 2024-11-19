import { Injectable } from '@nestjs/common';
import { TransitiveClosureService } from '../transitive-closure/transitive-closure.service';
import { graphJSONToSemantic } from '../utils/graph-utils';
import { GraphStructureDTO, GraphStructureSemanticDTO } from '@Interfaces/graphTask.dto';
import { FloydService } from '../floyd/floyd.service';

@Injectable()
export class ExampleSolutionGenerationService {

  constructor (
    private readonly transitiveClosureService: TransitiveClosureService,
    private readonly floydService: FloydService
  ) {}

  generateTransitiveClosureExampleSolution(initialStructure: GraphStructureDTO): GraphStructureDTO[] {

    // Convert the initial structure to semantic representation
    const initialStructureSemantic = graphJSONToSemantic(initialStructure);

    // Solve the question (nodesOrder is not important for this task)
    const nodesOrder: string[] = initialStructureSemantic.nodes.map(node => node.value);
    const expectedSolutionSemantic: GraphStructureSemanticDTO = this.transitiveClosureService.solveTransitiveClosure(initialStructureSemantic, nodesOrder);

    // Convert the semantic solution back to JSON representation where we have attributes like position, id etc.
    expectedSolutionSemantic.edges.forEach(generatedEdgeSemantic => {

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

  generateFloydExampleSolution(initialStructure: GraphStructureDTO): GraphStructureDTO[] {

    // Convert the initial structure to semantic representation
    const initialStructureSemantic = graphJSONToSemantic(initialStructure);

    // Solve the question (nodesOrder is not important for this task)
    const nodesOrder: string[] = initialStructureSemantic.nodes.map(node => node.value);
    const expectedSolutionSemantic: GraphStructureSemanticDTO[] = this.floydService.solveFloyd(initialStructureSemantic, nodesOrder);

    const generatedSolution: GraphStructureDTO[] = [];


    // Convert the semantic solution back to JSON representation where we have attributes like position, id etc.
    expectedSolutionSemantic.forEach(solutionStep => {
    
      const generatedSolutionStep: GraphStructureDTO = {
        nodes: JSON.parse(JSON.stringify(initialStructure.nodes)),
        edges: []
      }

      solutionStep.edges.forEach(generatedEdgeSemantic => {

        const node1Id = initialStructure.nodes.find(node => node.value == generatedEdgeSemantic.node1Value).nodeId;
        const node2Id = initialStructure.nodes.find(node => node.value == generatedEdgeSemantic.node2Value).nodeId;

        // Add edges edges to the solution step
        generatedSolutionStep.edges.push({
          node1Id: node1Id,
          node2Id: node2Id,
          weight: generatedEdgeSemantic.weight
        });
      });

      // Set the selected attribute for the nodes
      solutionStep.nodes.forEach(generatedNodeSemantic => {
        generatedSolutionStep.nodes.find(node => node.value == generatedNodeSemantic.value).selected = generatedNodeSemantic.selected;
      });

      // Add the solution step to the generated solution
      generatedSolution.push(generatedSolutionStep);
    });


    return generatedSolution;
  }
  
}

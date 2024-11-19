import { Injectable } from '@nestjs/common';
import { TransitiveClosureService } from '../transitive-closure/transitive-closure.service';
import { graphJSONToSemantic } from '../utils/graph-utils';
import { GraphStructureDTO, GraphStructureSemanticDTO } from '@Interfaces/graphTask.dto';
import { FloydService } from '../floyd/floyd.service';
import { DijkstraService } from '../dijkstra/dijkstra.service';

@Injectable()
export class ExampleSolutionGenerationService {

  constructor (
    private readonly transitiveClosureService: TransitiveClosureService,
    private readonly floydService: FloydService,
    private readonly dijkstraService: DijkstraService,
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

  generateDijkstraExampleSolution(initialStructure: GraphStructureDTO): GraphStructureDTO[] {

    const solution: GraphStructureDTO[] = [];
    let stepIndex = 0;

    while (stepIndex < initialStructure.nodes.length) {

        let previousStep: GraphStructureDTO = JSON.parse(JSON.stringify(stepIndex === 0 ? initialStructure : solution[stepIndex - 1]));
        let previousStepSemantic: GraphStructureSemanticDTO = graphJSONToSemantic(previousStep);

        const unvisitedNodes = previousStepSemantic.nodes.filter(node => !node.selected);

        if (unvisitedNodes.length === 0) {
            break;
        }

        const minWeight = Math.min(...unvisitedNodes.map(node => node.weight));
        const possibleNextNodes = unvisitedNodes.filter(node => node.weight === minWeight);

        if (possibleNextNodes.length === 0) {
            break;
        }

        const visitedNode = possibleNextNodes[0];

        const { possibleNextStep, continueEvaluation } = this.dijkstraService.findPossibleNextStep(previousStepSemantic, visitedNode.value);

        if (!continueEvaluation) {
            throw new Error('An unknown error is occurred when generating an example solution for dijkstra question.');
        }

        const currentStep: GraphStructureDTO = {
            nodes: [],
            edges: JSON.parse(JSON.stringify(previousStep.edges))
        }

        for (let node of previousStep.nodes) {
            const nodeCopy = JSON.parse(JSON.stringify(node));
            const { selected, weight } = possibleNextStep.nodes.find(n => n.value === node.value);

            nodeCopy.selected = selected;
            nodeCopy.weight = weight;

            currentStep.nodes.push(nodeCopy);
        }

        solution.push(currentStep);
        stepIndex++;
    }
    
    return solution;
  }
  
}

import { Injectable } from '@nestjs/common';
import { TransitiveClosureService } from '../transitive-closure/transitive-closure.service';
import { graphJSONToSemantic } from '../utils/graph-utils';
import type {
  GraphEdgeSemanticDTO,
  GraphStructureDTO,
  GraphStructureSemanticDTO,
} from '@Interfaces/graphTask.dto';
import { FloydService } from '../floyd/floyd.service';
import { DijkstraService } from '../dijkstra/dijkstra.service';
import { KruskalService } from '../kruskal/kruskal.service';

@Injectable()
export class ExampleSolutionGenerationService {
  constructor(
    private readonly transitiveClosureService: TransitiveClosureService,
    private readonly floydService: FloydService,
    private readonly dijkstraService: DijkstraService,
    private readonly kruskalService: KruskalService,
  ) {}

  generateTransitiveClosureExampleSolution(
    initialStructure: GraphStructureDTO,
  ): GraphStructureDTO[] {
    // Convert the initial structure to semantic representation
    const initialStructureSemantic = graphJSONToSemantic(initialStructure);

    // Solve the question (nodesOrder is not important for this task)
    const nodesOrder: string[] = initialStructureSemantic.nodes.map(node => node.value);
    const expectedSolutionSemantic: GraphStructureSemanticDTO =
      this.transitiveClosureService.solveTransitiveClosure(initialStructureSemantic, nodesOrder);

    // Convert the semantic solution back to JSON representation where we have attributes like position, id etc.
    expectedSolutionSemantic.edges.forEach(generatedEdgeSemantic => {
      const node1Id = initialStructure.nodes.find(
        node => node.value == generatedEdgeSemantic.node1Value,
      ).nodeId;
      const node2Id = initialStructure.nodes.find(
        node => node.value == generatedEdgeSemantic.node2Value,
      ).nodeId;

      // Add new edges to the initial structure if it does not exist
      if (
        initialStructure.edges.find(
          initialEdge => initialEdge.node1Id === node1Id && initialEdge.node2Id === node2Id,
        ) == undefined
      ) {
        initialStructure.edges.push({
          node1Id: node1Id,
          node2Id: node2Id,
          weight: null,
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
    const expectedSolutionSemantic: GraphStructureSemanticDTO[] = this.floydService.solveFloyd(
      initialStructureSemantic,
      nodesOrder,
    );

    const generatedSolution: GraphStructureDTO[] = [];

    // Convert the semantic solution back to JSON representation where we have attributes like position, id etc.
    expectedSolutionSemantic.forEach(solutionStep => {
      const generatedSolutionStep: GraphStructureDTO = {
        nodes: JSON.parse(JSON.stringify(initialStructure.nodes)),
        edges: [],
      };

      solutionStep.edges.forEach(generatedEdgeSemantic => {
        const node1Id = initialStructure.nodes.find(
          node => node.value == generatedEdgeSemantic.node1Value,
        ).nodeId;
        const node2Id = initialStructure.nodes.find(
          node => node.value == generatedEdgeSemantic.node2Value,
        ).nodeId;

        // Add edges edges to the solution step
        generatedSolutionStep.edges.push({
          node1Id: node1Id,
          node2Id: node2Id,
          weight: generatedEdgeSemantic.weight,
        });
      });

      // Set the selected attribute for the nodes
      solutionStep.nodes.forEach(generatedNodeSemantic => {
        generatedSolutionStep.nodes.find(
          node => node.value == generatedNodeSemantic.value,
        ).selected = generatedNodeSemantic.selected;
      });

      // Add the solution step to the generated solution
      generatedSolution.push(generatedSolutionStep);
    });

    return generatedSolution;
  }

  generateDijkstraExampleSolution(initialStructure: GraphStructureDTO): GraphStructureDTO[] {
    const solution: GraphStructureDTO[] = [];
    let stepIndex = 0;

    // Generate the solution step by step
    while (stepIndex < initialStructure.nodes.length) {
      // Copy the previous step
      const previousStep: GraphStructureDTO = JSON.parse(
        JSON.stringify(stepIndex === 0 ? initialStructure : solution[stepIndex - 1]),
      );
      const previousStepSemantic: GraphStructureSemanticDTO = graphJSONToSemantic(previousStep);

      // Find the unvisited nodes
      const unvisitedNodes = previousStepSemantic.nodes.filter(node => !node.selected);

      // If there are no unvisited nodes, break the loop
      if (unvisitedNodes.length === 0) {
        break;
      }

      // Find the nodes with the minimum weight
      const minWeight = Math.min(...unvisitedNodes.map(node => node.weight));
      const possibleNextNodes = unvisitedNodes.filter(node => node.weight === minWeight);

      // If there are no possible next nodes, break the loop
      if (possibleNextNodes.length === 0) {
        break;
      }

      // Select the first node from the possible next nodes
      const visitedNode = possibleNextNodes[0];

      // Find the possible next step
      const { possibleNextStep, continueEvaluation } = this.dijkstraService.findPossibleNextStep(
        previousStepSemantic,
        visitedNode.value,
      );

      // If the evaluation cannot be continued, throw an error
      if (!continueEvaluation) {
        throw new Error(
          'An unknown error is occurred when generating an example solution for dijkstra question.',
        );
      }

      // Create the current step
      const currentStep: GraphStructureDTO = {
        nodes: [],
        edges: JSON.parse(JSON.stringify(previousStep.edges)),
      };

      // Adjust the nodes of the current step
      for (const node of previousStep.nodes) {
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

  generateKruskalExampleSolution(initialStructure: GraphStructureDTO): GraphStructureDTO[] {
    // Convert the initial structure to semantic representation
    const initialStructureSemantic = graphJSONToSemantic(initialStructure);

    // Generate new edges for each step (findOne flag is set to true to generate only one possible solution)
    const solutionEdgesSemantic: GraphEdgeSemanticDTO[][] =
      this.kruskalService.generatePossibleMSTs(initialStructureSemantic.edges, true);

    // Solution to be returned
    const generatedSolution: GraphStructureDTO[] = [];

    // Check if the array of possible solutions is empty
    if (solutionEdgesSemantic.length === 0) {
      throw new Error(
        'An unknown error is occurred when generating an example solution for kruskal question.',
      );
    }

    // Generate the solution using the generated edges for each step
    for (const generatedEdgeSemantic of solutionEdgesSemantic[0]) {
      const generatedSolutionStep: GraphStructureDTO = {
        nodes: JSON.parse(JSON.stringify(initialStructure.nodes)),
        edges:
          generatedSolution.length === 0
            ? []
            : JSON.parse(JSON.stringify(generatedSolution[generatedSolution.length - 1].edges)),
      };

      const node1Id = initialStructure.nodes.find(
        node => node.value == generatedEdgeSemantic.node1Value,
      ).nodeId;
      const node2Id = initialStructure.nodes.find(
        node => node.value == generatedEdgeSemantic.node2Value,
      ).nodeId;

      // Add edges edges to the solution step
      generatedSolutionStep.edges.push({
        node1Id: node1Id,
        node2Id: node2Id,
        weight: generatedEdgeSemantic.weight,
      });

      generatedSolution.push(generatedSolutionStep);
    }

    return generatedSolution;
  }
}

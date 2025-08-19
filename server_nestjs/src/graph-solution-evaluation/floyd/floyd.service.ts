import { Injectable } from '@nestjs/common';
import { GraphStructureDTO, GraphStructureSemanticDTO } from '@DTOs/graphTask.dto';
import {
  getEdgesWithDifferentWeights,
  getExtraEdges,
  graphJSONToSemantic,
  graphsContainSameNodes,
} from '../utils/graph-utils';

@Injectable()
export class FloydService {
  /**
   * Evaluates the student's solution for a graph-based assignment by comparing it to an expected solution.
   *
   * - Ensures each step has a unique current node and evaluates node visitation order.
   * - Simulates the solution using the student's node order and calculates step points based on node count in the initial graph.
   * - Compares the student's solution to the expected one, assessing node correctness, expected changes, and errors (missing/extra edges, incorrect weights).
   * - Accumulates expected changes to prevent unfair point deductions and provides feedback for each step.
   * - Summarizes total points and notes if fewer steps than expected were provided.
   *
   * @param {GraphStructureDTO} initialStructure - The initial graph structure used as the base for comparison.
   * @param {GraphStructureDTO[]} studentSolution - The student's solution, containing multiple steps with graph structures.
   * @param {number} maxPoints - The maximum points the student can earn for the entire solution.
   *
   * @returns {{ receivedPoints: number, feedback: string, feedbackHTML: string, expectedSolutionSemantic: GraphStructureSemanticDTO[] }} - The total points earned and detailed feedback for each step.
   */
  evaluateSolution(
    initialStructure: GraphStructureDTO,
    studentSolution: GraphStructureDTO[],
    maxPoints: number,
  ) {
    // Convert solutions from IGraphDataJSON to IGraphDataSemantic, where edges use node values instead of IDs,
    // as IDs may differ in different solutions even for the same node values.
    const initialStructureSemantic: GraphStructureSemanticDTO =
      graphJSONToSemantic(initialStructure);

    const studentSolutionSemantic: GraphStructureSemanticDTO[] = [];
    studentSolution.forEach(solutionStep => {
      const solutionStepSemantic = graphJSONToSemantic(solutionStep);
      studentSolutionSemantic.push(solutionStepSemantic);
    });

    let receivedPoints = 0;
    let feedback: string[] = [];
    let feedbackHTML: string[] = [];

    // Check in which order the student solved the assignment
    const {
      nodesOrder,
      continueEvaluation,
      feedback: feedbackNodesOrder,
    } = this.getNodesOrder(studentSolutionSemantic);

    // The studentSolution must have exactly one unique node marked as the current node in each step.
    // If not, award no points for this step.
    if (!continueEvaluation) {
      feedback.push(feedbackNodesOrder);
      feedback.push(`\n> Insgesamt erzielte Punkte: 0 / ${maxPoints}.`);
      feedbackHTML.push(feedbackNodesOrder);
      feedbackHTML.push(`\n<strong>> Insgesamt erzielte Punkte:</strong> 0 / ${maxPoints}.`);

      const feedbackString = feedback.join('\n');

      return {
        receivedPoints,
        feedback: feedback.join('\n'),
        feedbackHTML: feedbackHTML.join('\n'),
        expectedSolutionSemantic: [],
      };
    }

    // Solve the assignment with given nodesOrder
    const expectedSolutionSemantic: GraphStructureSemanticDTO[] = this.solveFloyd(
      initialStructureSemantic,
      nodesOrder,
    );

    // TODO: Is there anything to check with expectedSolution?

    // Calculate the maximum points a step can award (the number of steps is expected to equal the number of nodes)
    const maxStepPoints: number = maxPoints / initialStructure.nodes.length;

    // Accumulate expected changes from each step, including previous steps when calculating step points.
    // This prevents mistakes from previous steps from accumulating unfairly.
    // This method ensures a fairer distribution of points.
    let countExpectedChanges = 0;

    // Check each student solution step successively
    for (let stepIndex = 0; stepIndex < studentSolution.length; stepIndex++) {
      let stepReceivedPoints = 0;
      let stepFeedback = `Schritt ${stepIndex + 1}: `;
      let stepFeedbackHTML = `<strong>Schritt ${stepIndex + 1}:</strong> `;

      // If the student solution has more steps than the expected solution,
      // they get no points for any extra steps beyond the expected number.
      if (stepIndex >= expectedSolutionSemantic.length) {
        feedback.push(
          `${stepFeedback}Keine Punkte da es die Anzahl der maximalen erwarteten Schritte überschreitet.`,
        );
        feedback.push('\n###############\n');
        feedbackHTML.push(
          `${stepFeedbackHTML}Keine Punkte da es die Anzahl der maximalen erwarteten Schritte überschreitet.`,
        );
        feedbackHTML.push('');
        continue; // no points for this step
      }

      // Get the solutions for current step
      const studentStep: GraphStructureSemanticDTO = studentSolutionSemantic[stepIndex];
      const expectedStep: GraphStructureSemanticDTO = expectedSolutionSemantic[stepIndex];

      // Get the solution for previous step / initial step to calculate how many changes are expected
      const prevExpectedStep: GraphStructureSemanticDTO =
        stepIndex > 0 ? expectedSolutionSemantic[stepIndex - 1] : initialStructureSemantic;

      // Check if the student solution contains the same nodes as the expected solution for the current step.
      // If not, award no points for this step.
      const sameNodesExist = graphsContainSameNodes(studentStep, expectedStep);

      if (!sameNodesExist) {
        feedback.push(
          `${stepFeedback} Keine Punkte, da die Lösung nicht die gleiche Knoten enthält, wie die Musterlösung.`,
        );
        feedback.push('\n###############\n');
        feedbackHTML.push(
          `${stepFeedbackHTML} Keine Punkte, da die Lösung nicht die gleiche Knoten enthält, wie die Musterlösung.`,
        );
        feedbackHTML.push('');
        continue; // no points for this step
      }

      // Calculate the number of expected changes in this step (newEdges + edgesWithNewWeight)
      const countExpectedNewEdges: number = getExtraEdges(
        expectedStep.edges,
        prevExpectedStep.edges,
      ).length;
      const countExpectedNewWeights: number = getEdgesWithDifferentWeights(
        expectedStep.edges,
        prevExpectedStep.edges,
      ).length;

      // Calculate the number of mistakes in student solution (missingEdges + extraEdges + edgesWithWrongWeight)
      const countMissingEdges: number = getExtraEdges(expectedStep.edges, studentStep.edges).length;
      const countExtraEdges: number = getExtraEdges(studentStep.edges, expectedStep.edges).length;

      // Calculate the number of edges with incorrect weights in the student's solution
      const edgesWithDifferentWeights: string[] = getEdgesWithDifferentWeights(
        studentStep.edges,
        expectedStep.edges,
      );
      const countDifferentWeights: number = edgesWithDifferentWeights.length;

      // Calculate the total number of expected changes and mistakes for this step
      const countExpectedNewChanges = countExpectedNewEdges + countExpectedNewWeights;
      const countMistakes = countMissingEdges + countExtraEdges + countDifferentWeights;

      // Accumulate the total number of expected changes over all steps
      countExpectedChanges += countExpectedNewChanges;

      // Calculate the score for the step
      if (countExpectedChanges !== 0) {
        stepReceivedPoints = maxStepPoints - maxStepPoints * (countMistakes / countExpectedChanges);
      } else {
        if (countMistakes === 0) {
          stepReceivedPoints = maxStepPoints;
        }
      }

      // Ensure it is not less than zero
      stepReceivedPoints = Math.max(stepReceivedPoints, 0);

      // Feedback for mistakes
      if (countExtraEdges > 0 || countMissingEdges > 0) {
        stepFeedback += `\n Die Lösung enthält zusätzliche/fehlende Kanten.`;
        stepFeedbackHTML += `\n Die Lösung enthält zusätzliche/fehlende Kanten.`;
      }
      if (countDifferentWeights > 0) {
        stepFeedback += `\n Die Lösung enthält Kanten mit falschen Gewichten.`;
        stepFeedbackHTML += `\n Die Lösung enthält Kanten mit falschen Gewichten.`;
      }

      // Feedback for the current solution step
      if (stepReceivedPoints === maxStepPoints) {
        stepFeedback += '\n Der Lösungsschritt ist korrekt!';
        stepFeedbackHTML += '\n Der Lösungsschritt ist korrekt!';
      }

      // Update feedback and points for this step
      feedback.push(
        `${stepFeedback} \n Punkte für diesen Schritt: ${stepReceivedPoints.toFixed(
          2,
        )} / ${maxStepPoints.toFixed(2)}`,
      );
      feedback.push('\n###############\n');
      feedbackHTML.push(
        `${stepFeedbackHTML} \n<strong>></strong> Punkte für diesen Schritt: ${stepReceivedPoints.toFixed(
          2,
        )} / ${maxStepPoints.toFixed(2)}`,
      );
      feedbackHTML.push('');
      receivedPoints += stepReceivedPoints;
    }

    // Check if the studentSolution has less steps than expectedSolution
    const hasLessSteps = studentSolutionSemantic.length < initialStructure.nodes.length;
    if (hasLessSteps) {
      feedback.push(`Die Lösung enthält weniger Schritte als erwartet.`);
      feedback.push('\n###############\n');
      feedbackHTML.push(`<strong>Hinweis:</strong>`);
      feedbackHTML.push(`Die Lösung enthält weniger Schritte als erwartet.`);
      feedbackHTML.push('');
    }

    // If student solution is correct than only give feedback that the solution is correct
    if (receivedPoints === maxPoints) {
      feedback = ['Die Lösung ist korrekt.'];
      feedbackHTML = ['Die Lösung ist korrekt.'];
      feedbackHTML.push('');
    }

    // Final feedback
    feedback.push(`\n> Insgesamt erzielte Punkte: ${receivedPoints.toFixed(2)} / ${maxPoints}.`);
    feedbackHTML.push(
      `<strong>> Insgesamt erzielte Punkte:</strong> ${receivedPoints.toFixed(2)} / ${maxPoints}.`,
    );

    return {
      receivedPoints,
      feedback: feedback.join('\n'),
      feedbackHTML: feedbackHTML.join('\n'),
      expectedSolutionSemantic: expectedSolutionSemantic,
    };
  }

  /**
   * Generates the solution steps for the Floyd-Warshall algorithm using a specified node visitation order.
   *
   * @param initialStructure - The initial graph structure containing nodes and edges.
   * @param nodesOrder - The order in which nodes should be processed as intermediate nodes.
   * @returns An array of graph structures representing each step of the solution.
   */
  solveFloyd(
    initalStructure: GraphStructureSemanticDTO,
    nodesOrder: string[],
  ): GraphStructureSemanticDTO[] {
    const expectedSolution: GraphStructureSemanticDTO[] = [];

    // Generate each step of the solution in the given nodes order
    for (let stepIndex = 0; stepIndex < nodesOrder.length; stepIndex++) {
      // In each step, there is a current node which is the intermediate node
      const currentNodeValue = nodesOrder[stepIndex];

      // The previous step content is required for each step
      // For the first step use initialStructure
      // Clone it so that the original content is unchanged
      const previousStep: GraphStructureSemanticDTO =
        stepIndex > 0
          ? JSON.parse(JSON.stringify(expectedSolution[stepIndex - 1]))
          : JSON.parse(JSON.stringify(initalStructure));

      // Clone the previous step, and use the clone as start point for the current step
      const currentStep: GraphStructureSemanticDTO = JSON.parse(JSON.stringify(previousStep));

      // Modify nodes so that only the current node is marked
      currentStep.nodes = currentStep.nodes.map(node => {
        if (node.value === currentNodeValue) {
          return { ...node, selected: true };
        }
        return { ...node, selected: false };
      });

      // We need the edges where the current node is intermediate node
      const edgesCurrentAsSource = previousStep.edges.filter(
        edge => edge.node1Value === currentNodeValue,
      );
      const edgesCurrentAsDestination = previousStep.edges.filter(
        edge => edge.node2Value === currentNodeValue,
      );

      // Update the edges if the intermediate node decreases the cost for the connected nodes
      edgesCurrentAsDestination.forEach(currentAsDestination => {
        edgesCurrentAsSource.forEach(currentAsSource => {
          // Find the index of the edge where A is intermediate node
          const edgeIndexToUpdate = currentStep.edges.findIndex(
            edge =>
              edge.node1Value === currentAsDestination.node1Value &&
              edge.node2Value === currentAsSource.node2Value,
          );

          // TODO: Is weight === undefined required ??
          // weight = Number.MAX_SAFE_INTEGER if the weight is undefined
          const newWeight =
            currentAsDestination.weight !== undefined && currentAsSource.weight !== undefined
              ? currentAsDestination.weight + currentAsSource.weight
              : Number.MAX_SAFE_INTEGER;

          // If this edge does not exist, Than add it to the list using the weight through A as intermediate node
          if (edgeIndexToUpdate === -1) {
            currentStep.edges.push({
              node1Value: currentAsDestination.node1Value,
              node2Value: currentAsSource.node2Value,
              weight: newWeight,
            });
          }

          // If the edge exists, Than update it's weight if through A it can be decreased
          else {
            // TODO: Is weight === undefined required ??
            // weight = Number.MAX_SAFE_INTEGER if the weight is undefined
            let prevWeight = currentStep.edges[edgeIndexToUpdate].weight;
            prevWeight = prevWeight !== undefined ? prevWeight : Number.MAX_SAFE_INTEGER;

            // Update the edge so that it has the minimum weight
            currentStep.edges[edgeIndexToUpdate].weight = Math.min(prevWeight, newWeight);
          }
        });
      });

      // Add the step to the list of the solution steps
      expectedSolution.push(currentStep);
    }

    return expectedSolution;
  }

  /**
   * Determines the order in which nodes are marked as "selected" in each step of the solution.
   * Ensures that each step has exactly one marked node, and that no node is marked more than once.
   *
   * @param solution - An array of graph structures representing the steps of the student's solution.
   * @returns An object containing:
   *  - `continueEvaluation`: A boolean indicating whether the evaluation can proceed.
   *  - `nodesOrder`: An array of node values representing the order of visitation.
   *  - `feedback`: A feedback message if the solution does not meet the requirement of exactly one unique marked node per step.
   */
  getNodesOrder(solution: GraphStructureSemanticDTO[]): {
    continueEvaluation: boolean;
    nodesOrder: string[];
    feedback: string;
  } {
    const nodesOrder: string[] = [];

    // Loop solution steps to find out which node is marked in each step
    for (const step of solution) {
      // Get the marked node (Only one node can marked in a step )
      const markedNodes = step.nodes.filter(node => node.selected);

      // Check if only one single node is marked as current
      if (markedNodes.length !== 1) {
        return {
          continueEvaluation: false,
          nodesOrder: [],
          feedback: 'In jedem Schritt muss genau ein Knoten als aktueller Knoten markiert werden.',
        };
      }

      const markedNode = markedNodes[0].value;

      // Check if the marked node is already marked in previous steps
      if (nodesOrder.includes(markedNode)) {
        return {
          continueEvaluation: false,
          nodesOrder: [],
          feedback:
            'In jedem Schritt muss genau ein eindeutiger Knoten als aktueller Knoten markiert sein.',
        };
      }

      // Get the marked node
      nodesOrder.push(markedNode);
    }

    return {
      continueEvaluation: true,
      nodesOrder,
      feedback: '',
    };
  }
}

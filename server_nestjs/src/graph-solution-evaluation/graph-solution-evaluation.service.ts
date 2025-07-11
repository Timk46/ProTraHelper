import { Injectable } from '@nestjs/common';
import { TransitiveClosureService } from './transitive-closure/transitive-closure.service';
import { DijkstraService } from './dijkstra/dijkstra.service';
import type { GraphQuestionDTO } from '@DTOs/question.dto';
import type { GraphStructureDTO } from '@Interfaces/graphTask.dto';
import { FloydService } from './floyd/floyd.service';
import { KruskalService } from './kruskal/kruskal.service';

@Injectable()
export class GraphSolutionEvaluationService {
  constructor(
    private readonly transitiveClosureService: TransitiveClosureService,
    private readonly dijkstraService: DijkstraService,
    private readonly floydService: FloydService,
    private readonly kruskalService: KruskalService,
  ) {}

  /**
   * Evaluates a student's solution for a graph-related question.
   *
   * @param {GraphQuestionDTO} question - The question object containing question related informations
   * @param {GraphStructureDTO[]} studentSolution - The student's proposed solution, which can consist of one or multiple steps depending on the question type.
   * @returns {Object} An object containing the evaluation results:
   *                   - `feedback`: A plain-text description of the evaluation result.
   *                   - `feedbackHTML`: An HTML-formatted version of the feedback.
   *                   - `receivedPoints`: The points awarded based on the correctness of the solution.
   *                   - `expectedSolutionSemantic`: One of the correct solutions which is more close to the student's solution.
   * @throws {Error} If the question type is not supported.
   *
   * The function supports multiple types of graph problems, such as:
   * - `dijkstra`: Evaluates a solution for the Dijkstra shortest-path algorithm.
   * - `floyd`: Evaluates a solution for the Floyd-Warshall algorithm.
   * - `kruskal`: Evaluates a solution for the Kruskal minimum spanning tree algorithm.
   * - `transitive_closure`: Evaluates a solution for determining the transitive closure of a graph.
   *
   * If the student's solution is missing or empty, the function returns a score of 0 along with
   * appropriate feedback.
   */
  evaluateSolution(question: GraphQuestionDTO, studentSolution: GraphStructureDTO[]) {
    if (!studentSolution || studentSolution.length === 0) {
      return {
        feedback: 'Keine Lösung abgegeben.',
        feedbackHTML: 'Keine Lösung abgegeben.',
        receivedPoints: 0,
        expectedSolutionSemantic: [],
      };
    }

    // Some questions types require evaluating a single-step solution, while others require a multi-step solution
    // For single-step solutions, use the first step from the solution array `studentSolution[0]` `expectedSolution[0]`,
    // and for multi-step solutions, use the entire array `studentSolution`, `expectedSolution`
    switch (question.type) {
      case 'dijkstra':
        return this.dijkstraService.evaluateSolution(
          question.initialStructure,
          studentSolution,
          question.maxPoints,
        );

      case 'floyd':
        return this.floydService.evaluateSolution(
          question.initialStructure,
          studentSolution,
          question.maxPoints,
        );

      case 'kruskal':
        return this.kruskalService.evaluateSolution(
          question.initialStructure,
          studentSolution,
          question.maxPoints,
        );

      case 'transitive_closure':
        return this.transitiveClosureService.evaluateSolution(
          question.initialStructure,
          studentSolution[0],
          question.maxPoints,
        );

      default:
        throw new Error(`Der Aufgabentyp ${question.type} wird nicht unterstützt.`);
    }
  }
}

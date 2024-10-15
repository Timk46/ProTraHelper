import { Injectable } from '@nestjs/common';
import { TransitiveClosureService } from './transitive-closure/transitive-closure.service';
import { DijkstraService } from './dijkstra/dijkstra.service';
import { GraphQuestionDTO } from '@DTOs/question.dto';
import { GraphStructureDTO } from '@Interfaces/graphTask.dto';
import { FloydService } from './floyd/floyd.service';

@Injectable()
export class GraphSolutionEvaluationService {

    constructor(
        private readonly transitiveClosureService: TransitiveClosureService,
        private readonly dijkstraService: DijkstraService,
        private readonly floydService: FloydService,
        // Add services for individual question types here
    ){}

    evaluateSolution(question: GraphQuestionDTO, studentSolution: GraphStructureDTO[]) {

        // Some questions types require evaluating a single-step solution, while others require a multi-step solution 
        // For single-step solutions, use the first step from the solution array `studentSolution[0]` `expectedSolution[0]`, 
        // and for multi-step solutions, use the entire array `studentSolution`, `expectedSolution`
        switch (question.type) {
            
            case 'dijkstra':
                return this.dijkstraService.evaluateSolution(
                    studentSolution, 
                    question.exampleSolution,
                    question.maxPoints
                );

            case 'floyd':
                return this.floydService.evaluateSolution(
                    question.initialStructure, 
                    studentSolution,
                    question.maxPoints
                );

            case 'kruskal':
                return {
                    feedback: 'Not implemented yet', 
                    receivedPoints: 0
                }

            case 'transitive_closure':
                return this.transitiveClosureService.evaluateSolution(
                    question.initialStructure, 
                    studentSolution[0], 
                    question.exampleSolution[0], 
                    question.maxPoints
                );


            default:
                throw new Error(`Der Aufgabentyp ${question.type} wird nicht unterstützt.`);
            }

    }
}

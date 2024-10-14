import { Injectable } from '@nestjs/common';
import { TransitiveClosureService } from './transitive-closure/transitive-closure.service';

@Injectable()
export class GraphSolutionEvaluationService {

    constructor(
        private readonly transitiveClosureService: TransitiveClosureService,
        // Add services for individual question types here
    ){}

    evaluateSolution(question: any, studentSolution: any) {

        // Some questions types require evaluating a single-step solution, while others require a multi-step solution 
        // For single-step solutions, use the first step from the solution array `studentSolution[0]` `expectedSolution[0]`, 
        // and for multi-step solutions, use the entire array `studentSolution`, `expectedSolution`
        switch (question.type) {
            
            case 'dijkstra':
                return {
                    feedback: 'Not implemented yet', 
                    receivedPoints: 0
                }

            case 'floyd':
                return {
                    feedback: 'Not implemented yet', 
                    receivedPoints: 0
                }

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

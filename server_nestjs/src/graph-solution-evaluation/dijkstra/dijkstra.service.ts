import { Injectable } from '@nestjs/common';
import { getExtraVisitedNodes, getNodesWithDifferentWeights, getVisitedNodes, graphJSONToSemantic, graphsContainSameEdges, graphsContainSameNodes } from '../utils/graph-utils';
import { GraphStructureDTO, GraphStructureSemanticDTO, GraphNodeSemanticDTO } from '@DTOs/graphTask.dto';

@Injectable()
export class DijkstraService {

     /**
     * Evaluates a student's Dijkstra solution against the expected solution.
     *
     * Compares the student's solution step-by-step to the expected solution,
     * validating nodes, edges, visited status, and node weights. 
     * It awards points for each step based on correctness and provides detailed feedback. 
     * If the solution contains extra or missing nodes/edges, or has incorrect weights/visited attributes,
     * it adjusts the points accordingly.
     * The maximum points are divided evenly across all expected steps.
     * and unnecessary steps in the student solution are not awarded.
     *  
     * @param {GraphStructureDTO[]} studentSolution - The student's graph solution, with each element representing a step in the process.
     * @param {GraphStructureDTO[]} expectedSolution - The expected correct solution, with each element representing a step in the process.
     * @param {number} maxPoints - The maximum number of points that can be awarded for the assignment.
     * 
     * @returns {{ receivedPoints: number, feedback: string }} - An object containing the points awarded and feedback for each step.
     * 
     * @throws {Error} If the expected solution does not contain at least one step.
     */
     evaluateSolution(studentSolution: GraphStructureDTO[], expectedSolution: GraphStructureDTO[], maxPoints: number) {

        if (!(Array.isArray(expectedSolution) && expectedSolution.length >= 1)) { 
            throw new Error('Example Solution need to include one solution step at least.') 
        }

        // Convert solutions from IGraphDataJSON to IGraphDataSemantic, where edges use node values instead of IDs, 
        // as IDs may differ in different solutions even for the same node values.
        const studentSolutionSemantic: GraphStructureSemanticDTO[] = [];
        studentSolution.forEach(solutionStep => {
            const solutionStepSemantic = graphJSONToSemantic(solutionStep);
            studentSolutionSemantic.push(solutionStepSemantic);
        });
        
        const expectedSolutionSemantic: GraphStructureSemanticDTO[] = [];
        expectedSolution.forEach(solutionStep => {
            const solutionStepSemantic = graphJSONToSemantic(solutionStep);
            expectedSolutionSemantic.push(solutionStepSemantic);
        });


        const maxStepPoints: number = maxPoints / expectedSolutionSemantic.length;

        let receivedPoints: number = 0;
        const feedback: string[] = [];


        // Check each student solution step successively
        for (let stepIndex = 0; stepIndex < studentSolutionSemantic.length; stepIndex++) {

            let stepReceivedPoints: number = 0;
            let stepFeedback: string = `> Schritt ${stepIndex + 1}: `;

            // If the student solution has more steps than the expected solution, 
            // they get no points for any extra steps beyond the expected number.
            if (stepIndex >= expectedSolutionSemantic.length) {
                feedback.push(`${stepFeedback}Keine Punkte da es die Anzahl der maximalen erwarteten Schritte überschreitet.`);
                feedback.push('\n###############\n')
                continue; // no points for this step
            }
        
            // Get the solutions for current step
            const studentStep: GraphStructureSemanticDTO = studentSolutionSemantic[stepIndex];
            const expectedStep: GraphStructureSemanticDTO = expectedSolutionSemantic[stepIndex];
            
            // Check if the student solution contains the same nodes and edges as the expected solution
            // for the current step. If not, award no points for this step.
            const sameNodesExist = graphsContainSameNodes(studentStep, expectedStep);
            const sameEdgesExist = graphsContainSameEdges(studentStep, expectedStep);
            
            if (!sameNodesExist || !sameEdgesExist) {
                feedback.push(`${stepFeedback}Keine Punkte da die Lösung nicht die gleiche Knoten und Kanten enthält.`);
                feedback.push('\n###############\n')
                continue;  // no points for this step
            }
        
            // Check if the visited attribute is marked wrong in nodes
            const extraVisitedNodes: GraphNodeSemanticDTO[] = getExtraVisitedNodes(studentStep.nodes, expectedStep.nodes)
            const missingVisitedNodes: GraphNodeSemanticDTO[] = getExtraVisitedNodes(expectedStep.nodes, studentStep.nodes)
            const countExpectedVisitedNodes: number = getVisitedNodes(expectedStep.nodes).length
              
            // Calculate the points for the attribute visited and ensure it is not less than zero
            let tempPoints: number = (maxStepPoints / 2) - (maxStepPoints / 2) * ( (extraVisitedNodes.length + missingVisitedNodes.length) / countExpectedVisitedNodes )
            tempPoints = Math.max(tempPoints, 0)
            stepReceivedPoints += tempPoints
    
            // Feedback for visited attribute
            if (extraVisitedNodes.length > 0) {
                stepFeedback += '\n Die Lösung enthält Knoten, die unnötig als besucht markiert wurden.';
            }
            if (missingVisitedNodes.length > 0) {
                stepFeedback += '\n Die Lösung enthält Knoten, die nicht als besucht markiert wurden.';
            }
              
            // Calculate the points for the attribute weight and ensure it is not less than zero
            const countNodes: number = expectedStep.nodes.length;
            const countDifferentWeights: number = getNodesWithDifferentWeights(studentStep.nodes, expectedStep.nodes).length
            tempPoints = (maxStepPoints / 2) - (maxStepPoints / 2) * (countDifferentWeights / countNodes)
            tempPoints = Math.max(tempPoints, 0)
            stepReceivedPoints += tempPoints
        
            // Feedback for weight differences
            const nodesWithDifferentWeights: string[] = getNodesWithDifferentWeights(studentStep.nodes, expectedStep.nodes);
            if (nodesWithDifferentWeights.length > 0) {
                stepFeedback += '\n Die Lösung enthält Knoten mit falschen Gewichten';
            }
            
            if (stepReceivedPoints === maxStepPoints) {
                stepFeedback += '\n Der Lösungsschritt ist korrekt!';
            }

            // Update feedback and points for this step
            feedback.push(`${stepFeedback} \n Punkte für diesen Schritt: ${stepReceivedPoints.toFixed(2)} / ${maxStepPoints.toFixed(2)}`);
            feedback.push('\n###############\n')
            receivedPoints += stepReceivedPoints
        }

        // Check if the studentSolution has less steps than expectedSolution
        const hasLessSteps = (studentSolutionSemantic.length < expectedSolutionSemantic.length);
        if (hasLessSteps) {
            feedback.push(`Die Lösung enthält weniger Schritte als erwartet.`);
            feedback.push('\n###############\n')
        }
        
        // Final feedback
        feedback.push(`\n> Insgesamt erzielte Punkte: ${receivedPoints.toFixed(2)} / ${maxPoints}.`);

        return {
            receivedPoints,
            feedback: feedback.join('\n')
        }
    }

}

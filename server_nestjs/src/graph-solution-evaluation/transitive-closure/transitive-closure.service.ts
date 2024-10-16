import { Injectable } from '@nestjs/common';
import { GraphStructureDTO } from '@DTOs/graphTask.dto';
import { getExtraEdges, graphJSONToSemantic, graphsContainSameNodes, graphsIdentical } from '../utils/graph-utils'
import { GraphEdgeSemanticDTO } from '@DTOs/graphTask.dto';

@Injectable()
export class TransitiveClosureService {

    /**
     * Evaluates a student's graph solution against the expected solution.
     *
     * Compares the student's graph solution with the initial structure and the expected solution. 
     * Points are awarded based on the correctness of nodes and edges, with feedback provided for any missing or incorrect elements.
     * 
     * Assumptions:
     * - The student's solution must include all edges from the initial structure; otherwise, the score is zero.
     * - The edges in graph are directed.
     * - Attributes unrelated to the assignment (e.g., weight, visited) are not considered in the evaluation.
     *
     * @param {GraphStructureDTO} initialStructure - The initial graph structure in JSON format.
     * @param {GraphStructureDTO} studentSolution - The student's graph solution in JSON format.
     * @param {GraphStructureDTO} expectedSolution - The expected correct solution in JSON format.
     * @param {number} maxPoints - The maximum number of points that can be awarded for this assignment.
     * 
     * @returns {{ receivedPoints: number, feedback: string }} - An object containing the number of points received and feedback.
     */
    evaluateSolution(initialStructure: GraphStructureDTO, studentSolution: GraphStructureDTO, expectedSolution: GraphStructureDTO, maxPoints: number) {

        // Assumption: It is trivial if the studentSolution contains all/some/none of the edges which initialStructure contains
        // Assumption: Graph has only directed edges
        // Assumption: The node/ edge attributes which are not related to the assignment are not considered in the evaluation such as weight, visited etc.

        let receivedPoints = maxPoints;
        const feedback: string[] = [];
        
        // Convert solutions from IGraphDataJSON to IGraphDataSemantic, where edges use node values instead of IDs, 
        // as IDs may differ in different solutions even for the same node values.
        const initialStructureSemantic = graphJSONToSemantic(initialStructure);
        const studentSolutionSemantic = graphJSONToSemantic(studentSolution);
        const expectedSolutionSemantic = graphJSONToSemantic(expectedSolution);

        // Check if the studentSolution contains all required nodes and no unnecesary nodes 
        const sameNodesExist = graphsContainSameNodes(studentSolutionSemantic, expectedSolutionSemantic);

        if (!sameNodesExist) {
            feedback.push('Die Lösung enthält entweder inkorrekte oder fehlende Knoten.');
            feedback.push(`\n > Insgesamt erzielte Punkte: 0 / ${maxPoints}.`);
            return {
                receivedPoints,
                feedback: feedback.join('\n'),
            }        
        }
        
                
        // Check if the studentSolution includes all edges from the initialStructure
        const studentMissingInitialEdges = getExtraEdges(initialStructureSemantic.edges, studentSolutionSemantic.edges);

        if (studentMissingInitialEdges.length > 0) {
            feedback.push('Die Lösung muss alle Kanten des Ausgangsgraphen enthalten.');
            feedback.push(`\n > Insgesamt erzielte Punkte: 0 / ${maxPoints}.`);
            return {
                receivedPoints: 0,
                feedback: feedback.join('\n'),
            };
        }

        // Check if the studentSolution and expectedSolution are identical
        const areIdentical = graphsIdentical(studentSolutionSemantic, expectedSolutionSemantic);

        if (areIdentical) {
            feedback.push('Die Lösung ist korrekt.');
            feedback.push(`\n > Insgesamt erzielte Punkte: ${receivedPoints} / ${maxPoints}.`);
            return {
                receivedPoints,
                feedback: feedback.join('\n'),
            };  
        }
    
        // Check how many extra/missing edges studentSolution contains
        const edgesToAdd: GraphEdgeSemanticDTO[] = getExtraEdges(expectedSolutionSemantic.edges, initialStructureSemantic.edges);
        const studentNewEdges: GraphEdgeSemanticDTO[] = getExtraEdges(studentSolutionSemantic.edges, initialStructureSemantic.edges);
        
        const countStudentExtraEdges: number = getExtraEdges(studentNewEdges, edgesToAdd).length;
        const countStudentMissingEdges: number = getExtraEdges(edgesToAdd, studentNewEdges).length;
        const countEdgesToAdd: number = edgesToAdd.length

        // Calculate receivedPoints according to the number of extra/missing edges in studentSolution
        receivedPoints = maxPoints - maxPoints * ((countStudentExtraEdges + countStudentMissingEdges) / countEdgesToAdd);
        
        // Ensure points are not negative
        receivedPoints = Math.max(receivedPoints, 0);

        // Adjust the feedback according to the mistakes in the solution
        if (countStudentExtraEdges > 0) {
            feedback.push('Die Lösung enthält inkorrekte Kanten.');
        }

        if (countStudentMissingEdges > 0) {
            feedback.push('Die Lösung enthält fehlende Kanten.');
        }

        feedback.push(`\n > Insgesamt erzielte Punkte: ${receivedPoints} / ${maxPoints}.`);
        return {
            receivedPoints,
            feedback: feedback.join('\n'),
        }       

    }
}

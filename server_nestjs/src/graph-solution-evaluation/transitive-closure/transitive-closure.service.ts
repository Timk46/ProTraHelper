import { Injectable } from '@nestjs/common';
import { GraphStructureDTO, GraphStructureSemanticDTO } from '@DTOs/graphTask.dto';
import { getExtraEdges, graphJSONToSemantic, graphsContainSameNodes, graphsIdentical } from '../utils/graph-utils'
import { GraphEdgeSemanticDTO } from '@DTOs/graphTask.dto';
import { graphFeedbackGenerationPrompts } from '../utils/graph-feedback-generation.prompts';
import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';

@Injectable()
export class TransitiveClosureService {

    constructor(private readonly feedbackGenerationService: FeedbackGenerationService) {}

    /**
     * Evaluates a student's graph solution against the expected solution.
     *
     * Compares the student's graph solution with the initial structure and the expected solution. 
     * Points are awarded based on the correctness of nodes and edges, with feedback provided for any missing or incorrect elements.
     * 
     * Assumptions:
     * - The student's solution must include all edges from the initial structure; otherwise, the score is zero.
     * - The edges in graph are directed.
     * - Attributes unrelated to the assignment (e.g., weight, selected) are not considered in the evaluation.
     *
     * @param {GraphStructureDTO} initialStructure - The initial graph structure in JSON format.
     * @param {GraphStructureDTO} studentSolution - The student's graph solution in JSON format.
     * @param {GraphStructureDTO} expectedSolution - The expected correct solution in JSON format.
     * @param {number} maxPoints - The maximum number of points that can be awarded for this assignment.
     * 
     * @returns {{ receivedPoints: number, feedback: string }} - An object containing the number of points received and feedback.
     */
    async evaluateSolution(questionText: string, initialStructure: GraphStructureDTO, studentSolution: GraphStructureDTO, maxPoints: number) {

        // Assumption: It is trivial if the studentSolution contains all/some/none of the edges which initialStructure contains
        // Assumption: Graph has only directed edges
        // Assumption: The node/ edge attributes which are not related to the assignment are not considered in the evaluation such as weight, selected etc.

        // Convert solutions from IGraphDataJSON to IGraphDataSemantic, where edges use node values instead of IDs, 
        // as IDs may differ in different solutions even for the same node values.
        const initialStructureSemantic = graphJSONToSemantic(initialStructure);
        const studentSolutionSemantic = graphJSONToSemantic(studentSolution);

        const { receivedPoints, feedback, expectedSolutionSemantic } = this.algorithmicEvaluation(initialStructureSemantic, studentSolutionSemantic, maxPoints);

        // Improve the feedback by using LLM to generate a more detailed feedback
        const graphSystemMessage = graphFeedbackGenerationPrompts.graphFeedbackPrompt(
            questionText.replace(/{/g, '{{').replace(/}/g, '}}'),
            JSON.stringify(initialStructureSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
            JSON.stringify(expectedSolutionSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
            JSON.stringify(studentSolutionSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
            feedback.replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
            maxPoints
        );

        const generatedFeedback = await this.feedbackGenerationService.generateGraphFeedback(
            graphSystemMessage, JSON.stringify(studentSolutionSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
        );

        return {
            receivedPoints,
            feedback: JSON.stringify({
                algo: feedback,
                llm: generatedFeedback
            }),
        }       
    }

    algorithmicEvaluation(initialStructureSemantic: GraphStructureSemanticDTO, studentSolutionSemantic: GraphStructureSemanticDTO, maxPoints: number) {
        
        let receivedPoints = maxPoints;
        const feedback: string[] = [];

        // Solve the question (nodesOrder is not important for this task)
        const nodesOrder: string[] = initialStructureSemantic.nodes.map(node => node.value);
        const expectedSolutionSemantic: GraphStructureSemanticDTO = this.solveTransitiveClosure(initialStructureSemantic, nodesOrder);

        // Check if the studentSolution contains all required nodes and no unnecesary nodes 
        const sameNodesExist = graphsContainSameNodes(studentSolutionSemantic, expectedSolutionSemantic);

        if (!sameNodesExist) {
            feedback.push('Die Lösung enthält entweder inkorrekte oder fehlende Knoten.');
            feedback.push(`\n > Insgesamt erzielte Punkte: 0 / ${maxPoints}.`);
            return {
                receivedPoints,
                feedback: feedback.join('\n'),
                expectedSolutionSemantic
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
                expectedSolutionSemantic
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
                expectedSolutionSemantic
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
            expectedSolutionSemantic,
        };
    }

    /**
     * Generates the solution for the transitive closure question using a specified node visitation order.
     * 
     * @param initialStructure - The initial graph structure containing nodes and edges.
     * @param nodesOrder - The order in which nodes should be processed as intermediate nodes.
     * @returns An array of graph structures representing each step of the solution.
     */
    solveTransitiveClosure(initalStructure: GraphStructureSemanticDTO, nodesOrder: string[]): GraphStructureSemanticDTO {

        if (nodesOrder.length === 0) { 
            throw new Error('The nodesOrder array must contain at least one node value.');
        }

        const expectedSolution: GraphStructureSemanticDTO[] = [];
    
        // Generate each step of the solution in the given nodes order
        for (let stepIndex = 0; stepIndex < nodesOrder.length; stepIndex++) {
    
          // In each step, there is a current node which is the intermediate node 
          const currentNodeValue = nodesOrder[stepIndex];
          
          // The previous step content is required for each step
          // For the first step use initialStructure 
          // Clone it so that the original content is unchanged
          const previousStep: GraphStructureSemanticDTO = stepIndex > 0 ? JSON.parse(JSON.stringify(expectedSolution[stepIndex - 1])) : JSON.parse(JSON.stringify(initalStructure));
          
          // Clone the previous step, and use the clone as start point for the current step
          const currentStep: GraphStructureSemanticDTO = JSON.parse(JSON.stringify(previousStep));
    
          // We need the edges where the current node is intermediate node
          const edgesCurrentAsSource = previousStep.edges.filter( edge => edge.node1Value === currentNodeValue );
          const edgesCurrentAsDestination = previousStep.edges.filter( edge => edge.node2Value === currentNodeValue );
    
          // Update the edges if the intermediate node decreases the cost for the connected nodes 
          edgesCurrentAsDestination.forEach( currentAsDestination => {
    
            edgesCurrentAsSource.forEach( currentAsSource => {
    
              // Find the index of the edge where A is intermediate node
              const edgeIndexToUpdate = currentStep.edges.findIndex( edge => edge.node1Value === currentAsDestination.node1Value && edge.node2Value === currentAsSource.node2Value );
            
              // If this edge does not exist, Than add it to the list using the weight through A as intermediate node
              if (edgeIndexToUpdate === -1) {            
                currentStep.edges.push({
                  node1Value: currentAsDestination.node1Value,
                  node2Value: currentAsSource.node2Value,
                  // weight: undefined 
                });
              }
    
              // If the edge exists, do nothing
            })
          })
    
          // Add the step to the list of the solution steps
          expectedSolution.push(currentStep);
        } 
    
        // Return the last step of the solution as the final solution
        if (expectedSolution.length === 0) {
            throw new Error('The solution array must contain at least one step.');
        }
        
        return expectedSolution[expectedSolution.length - 1];
    }
}

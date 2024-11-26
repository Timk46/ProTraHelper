import { Injectable } from '@nestjs/common';
import { getExtraSelectedNodes, getNodesWithDifferentWeights, graphJSONToSemantic, graphsContainSameEdges, graphsContainSameNodes } from '../utils/graph-utils';
import { GraphStructureDTO, GraphStructureSemanticDTO, GraphNodeSemanticDTO } from '@DTOs/graphTask.dto';
import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';
import { graphFeedbackGenerationPrompts } from '../utils/graph-feedback-generation.prompts';

@Injectable()
export class DijkstraService {

    constructor(private readonly feedbackGenerationService: FeedbackGenerationService) {}

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
    async evaluateSolution(questionText: string, initialStructure: GraphStructureDTO, studentSolution: GraphStructureDTO[], maxPoints: number) {

        // Convert solutions from IGraphDataJSON to IGraphDataSemantic, where edges use node values instead of IDs, 
        // as IDs may differ in different solutions even for the same node values.
        const initialStructureSemantic: GraphStructureSemanticDTO = graphJSONToSemantic(initialStructure);

        const studentSolutionSemantic: GraphStructureSemanticDTO[] = [];
        studentSolution.forEach(solutionStep => {
            const solutionStepSemantic = graphJSONToSemantic(solutionStep);
            studentSolutionSemantic.push(solutionStepSemantic);
        });
        
        const expectedSolutionSemantic: GraphStructureSemanticDTO[] = [];


        // Initialize the necessary variables
        const maxStepPoints: number = maxPoints / initialStructure.nodes.length;
        let evaluateNextSteps = true;
        let receivedPoints: number = 0;
        let feedback: string[] = [];
        let lastEvaluatedStepIndex = 0
        

        // Check each student solution step successively
        for (let stepIndex = 0; stepIndex < studentSolutionSemantic.length; stepIndex++) {
            lastEvaluatedStepIndex = stepIndex;

            let stepReceivedPoints: number = 0;
            let stepFeedback: string = `> Schritt ${stepIndex + 1}: `;

            // If the student solution has more steps than the expected solution, 
            // they get no points for any extra steps beyond the expected number.
            // and the half of the total points is deducted.
            if (stepIndex >= initialStructure.nodes.length) {
                feedback.push(`Die Anzahl der Lösungsschritte überschreitet der maximalen erwarteten Schritte.`);
                receivedPoints -= maxPoints / 2;
                break; // no points for this step
            }
        
            // Get the solutions for current step
            const studentStep: GraphStructureSemanticDTO = studentSolutionSemantic[stepIndex];
            const studentPrevStep: GraphStructureSemanticDTO = stepIndex > 0 ? 
                                                JSON.parse(JSON.stringify(studentSolutionSemantic[stepIndex - 1])) : 
                                                JSON.parse(JSON.stringify(initialStructureSemantic));
            
            // Check if the student solution contains the same nodes and edges as the initial structure
            // for the current step. If not, award no points for this step.
            // And do not evaluate the next steps.
            const sameNodesExist = graphsContainSameNodes(studentStep, initialStructureSemantic);
            const sameEdgesExist = graphsContainSameEdges(studentStep, initialStructureSemantic);
            
            if (!sameNodesExist || !sameEdgesExist) {
                feedback.push(`${stepFeedback} \nDie Lösung muss nur alle korrekte Knoten und Kanten enthalten.`);
                feedback.push(`Punkte für diesen Schritt: ${stepReceivedPoints.toFixed(2)} / ${maxStepPoints.toFixed(2)}`);
                feedback.push('\n###############\n');
                evaluateNextSteps = false;
                break;  // no points for this step
            }

            // Find student visited node
            const studentNewVisitedNodes: GraphNodeSemanticDTO[] = getExtraSelectedNodes(studentStep.nodes, studentPrevStep.nodes);
            if (studentNewVisitedNodes.length !== 1) {
                feedback.push(`${stepFeedback} \nIn jedem Schritt muss genau ein neuer Knoten als besucht markiert werden.`);
                feedback.push(`Punkte für diesen Schritt: ${stepReceivedPoints.toFixed(2)} / ${maxStepPoints.toFixed(2)}`);
                feedback.push('\n###############\n');
                evaluateNextSteps = false;
                break; // no points for this step
            }

            // Get the correct solution for the previous step to generate correct solution for the current step
            const expectedPrevStep: GraphStructureSemanticDTO = stepIndex > 0 ? 
                                                                JSON.parse(JSON.stringify(expectedSolutionSemantic[stepIndex - 1])) : 
                                                                JSON.parse(JSON.stringify(initialStructureSemantic));
            const {
                possibleNextStep: expectedStep,
                continueEvaluation,
                feedback: feedbackNextStep
            } = this.findPossibleNextStep(expectedPrevStep, studentNewVisitedNodes[0].value);

            // If evaluation cannot continue, provide feedback and stop evaluating further steps
            // This can happen if the student's visited node is incorrect.
            if (continueEvaluation === false) {
                feedback.push(`${stepFeedback} \n${feedbackNextStep}`);
                feedback.push(`Punkte für diesen Schritt: ${stepReceivedPoints.toFixed(2)} / ${maxStepPoints.toFixed(2)}`);
                feedback.push('\n###############\n');
                evaluateNextSteps = false;
                break; // no points for this step
            }

            // Add the correct solution for the current step to the expected solution and calculate points
            expectedSolutionSemantic.push(expectedStep);
            stepReceivedPoints = (maxStepPoints / 2);

            // Calculate the points for the attribute weight and ensure it is not less than zero
            const countNodes: number = expectedStep.nodes.length;
            const countDifferentWeights: number = getNodesWithDifferentWeights(studentStep.nodes, expectedStep.nodes).length
            let tempPoints: number = (maxStepPoints / 2) - (maxStepPoints / 2) * (countDifferentWeights / countNodes)
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
        const hasLessSteps = (studentSolutionSemantic.length < initialStructureSemantic.nodes.length);

        // Update feedback according to why the evaluation stopped
        if (evaluateNextSteps === false && lastEvaluatedStepIndex < studentSolutionSemantic.length - 1) {
            feedback.push(`Daher wurden die nächsten Lösungsschritten nicht weiter bewertet.`);
            // feedback.push('\n###############\n')

        }
        else if (hasLessSteps) {
            feedback.push(`Die Lösung enthält weniger Schritte als erwartet.`);
            // feedback.push('\n###############\n')
        }

        // If student solution is correct than only give feedback that the solution is correct
        if (receivedPoints === maxPoints) {
            feedback = ['Die Lösung ist korrekt.'];
        }

        // Ensure that the points are not less than zero
        receivedPoints = Math.max(receivedPoints, 0);
        
        // Final feedback
        feedback.push(`\n> Insgesamt erzielte Punkte: ${receivedPoints.toFixed(2)} / ${maxPoints}.`);

        const feedbackString = feedback.join('\n');

        // Improve the feedback by using LLM to generate a more detailed feedback

        const graphSystemMessage = graphFeedbackGenerationPrompts.graphFeedbackPrompt(
            questionText.replace(/{/g, '{{').replace(/}/g, '}}'),
            JSON.stringify(initialStructureSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
            JSON.stringify(expectedSolutionSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
            JSON.stringify(studentSolutionSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
            feedbackString.replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
            maxPoints
        );

        const generatedFeedback = await this.feedbackGenerationService.generateGraphFeedback(
            graphSystemMessage, JSON.stringify(studentSolutionSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
        );

        return {
            receivedPoints,
            feedback: JSON.stringify({
                algo: feedbackString,
                llm: generatedFeedback
            }),
        }     
    }

    findPossibleNextStep(previousStep: GraphStructureSemanticDTO, visitedNodeValue: string): {
        possibleNextStep: GraphStructureSemanticDTO, 
        continueEvaluation: boolean, 
        feedback: string 
    } {

        // Find the node with the smallest distance value among the unvisited nodes
        const unvisitedNodes = previousStep.nodes.filter(node => !node.selected);

        const minWeight = Math.min(...unvisitedNodes.map(node => node.weight));
        const possibleNextNodes = unvisitedNodes.filter(node => node.weight === minWeight);

        if (possibleNextNodes.length === 0) {
            return {
                possibleNextStep: previousStep,
                continueEvaluation: false,
                feedback: 'Es gibt keine weiteren Schritte, da alle Knoten besucht wurden.'
            };
        }

        const visitedNodePrev = possibleNextNodes.find(node => node.value === visitedNodeValue);

        if (visitedNodePrev === undefined) {
            return {
                possibleNextStep: previousStep,
                continueEvaluation: false,
                feedback: 'Der besuchte Knoten ist nicht korrekt.'
            };
        }

        const nextStep: GraphStructureSemanticDTO = JSON.parse(JSON.stringify(previousStep));
        const visitedNodeCurr = nextStep.nodes.find(node => node.value === visitedNodeValue);
        visitedNodeCurr.selected = true;

        previousStep.edges.forEach(edge => {
            
            let neighborNodeValue = null;

            if (edge.node1Value === visitedNodeValue) {
                neighborNodeValue = edge.node2Value;
            }
            else if (edge.node2Value === visitedNodeValue) {
                neighborNodeValue = edge.node1Value;
            }
            else {
                return;
            }
            
            const neighborNodePrev = previousStep.nodes.find(node => node.value === neighborNodeValue);

            if (neighborNodePrev.weight > visitedNodePrev.weight + edge.weight) {
                nextStep.nodes.find(node => node.value === neighborNodeValue).weight = visitedNodePrev.weight + edge.weight;
            }
            
        });

        return {
            possibleNextStep: nextStep,
            continueEvaluation: true,
            feedback: ''
        };	
    }

}

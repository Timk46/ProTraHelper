import { Injectable } from '@nestjs/common';
import { GraphEdgeSemanticDTO, GraphStructureSemanticDTO, GraphStructureDTO } from '@DTOs/graphTask.dto';
import { getExtraEdgesUndirectedGraph, graphJSONToSemantic, graphsContainSameNodes } from '../utils/graph-utils';
import { graphFeedbackGenerationPrompts } from '../utils/graph-feedback-generation.prompts';
import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';

export interface IUnionFind {
    parent: { [key: string]: string };
}

@Injectable()
export class KruskalService {

    constructor(private readonly feedbackGenerationService: FeedbackGenerationService) {}

    async evaluateSolution(questionText: string, initialStructure: GraphStructureDTO, studentSolution: GraphStructureDTO[], maxPoints: number) {
 
        // Convert solutions from IGraphDataJSON to IGraphDataSemantic, where edges use node values instead of IDs, 
        // as IDs may differ in different solutions even for the same node values.
        const initialStructureSemantic: GraphStructureSemanticDTO = graphJSONToSemantic(initialStructure);

        const studentSolutionSemantic: GraphStructureSemanticDTO[] = [];
        studentSolution.forEach(solutionStep => {
            const solutionStepSemantic = graphJSONToSemantic(solutionStep);
            studentSolutionSemantic.push(solutionStepSemantic);
        });

        // Check if the student solution has correct nodes in each step
        let correctNodes = true;
        studentSolutionSemantic.forEach( studentStep => {
            const sameNodesExist = graphsContainSameNodes(studentStep, initialStructureSemantic);
            if (!sameNodesExist) { correctNodes = false; }
        })

        if (!correctNodes) {
            const graphSystemMessage = graphFeedbackGenerationPrompts.graphFeedbackPrompt(
                questionText.replace(/{/g, '{{').replace(/}/g, '}}'),
                JSON.stringify(initialStructureSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
                null,
                JSON.stringify(studentSolutionSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
                'Der Graph muss dieselben Knoten wie der Ausgangsgraph haben.',
                maxPoints
            );
    
            const generatedFeedback = await this.feedbackGenerationService.generateGraphFeedback(
                graphSystemMessage, JSON.stringify(studentSolutionSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
            );
    
            return {
                receivedPoints: 0,
                feedback: JSON.stringify({
                    algo: 'Der Graph muss dieselben Knoten wie der Ausgangsgraph haben.',
                    llm: generatedFeedback
                }),
            }
        }

        const studentNewEdgesByStep: GraphEdgeSemanticDTO[][] = [];
        const studentRemovedEdgesByStep: GraphEdgeSemanticDTO[][] = [];

        // Get the new added/removed edge for each step of student solution
        for (let stepIndex = 0; stepIndex < studentSolutionSemantic.length; stepIndex++) {
   
            const currentStepEdges: GraphEdgeSemanticDTO[] = studentSolutionSemantic[stepIndex].edges;
            const prevStepEdges: GraphEdgeSemanticDTO[] = stepIndex > 0 ? studentSolutionSemantic[stepIndex-1].edges : [];

            const studentNewEdges = getExtraEdgesUndirectedGraph(currentStepEdges, prevStepEdges);
            const studentRemovedEdges = getExtraEdgesUndirectedGraph(prevStepEdges, currentStepEdges);

            studentNewEdgesByStep.push(studentNewEdges); 
            studentRemovedEdgesByStep.push(studentRemovedEdges);
        }

        // Generate all possible solutions
        const allPossibleSolutions: GraphEdgeSemanticDTO[][] = this.generatePossibleMSTs(initialStructureSemantic.edges);

        let receivedPoints = 0;
        let feedback = ''; 
        let feedbackHTML = ''; 
        let indexOfBestSolution = -1;

        // Iterate through each generated possible solution to evaluate against the student's submission
        allPossibleSolutions.forEach( (possibleSolution: GraphEdgeSemanticDTO[]) => {

            // Evaluate the student's solution using the current possible solution and accumulate points and feedback
            const { possibleReceivedPoints, possibleFeedback, possibleFeedbackHTML } = this.evaluatePossibleSolution(
                studentNewEdgesByStep, studentRemovedEdgesByStep, possibleSolution, maxPoints
            );

            // Update the received points and feedback if the current evaluation yields a higher score
            if (possibleReceivedPoints >= receivedPoints) {
                receivedPoints = possibleReceivedPoints;
                feedback = possibleFeedback;
                feedbackHTML = possibleFeedbackHTML;
                indexOfBestSolution = allPossibleSolutions.indexOf(possibleSolution);
            }
        })

        // Improve the feedback by using LLM to generate a more detailed feedback
        const graphSystemMessage = graphFeedbackGenerationPrompts.graphFeedbackPrompt(
            questionText.replace(/{/g, '{{').replace(/}/g, '}}'),
            JSON.stringify(initialStructureSemantic).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
            indexOfBestSolution === -1 ? null : JSON.stringify(allPossibleSolutions[indexOfBestSolution]).replace(/[{]/g, '{{').replace(/[}]/g, '}}'),
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
                algo: feedbackHTML,
                llm: generatedFeedback
            }),
        }
    }

    evaluatePossibleSolution(studentNewEdgesByStep: GraphEdgeSemanticDTO[][], studentRemovedEdgesByStep: GraphEdgeSemanticDTO[][], possibleSolution: GraphEdgeSemanticDTO[], maxPoints: number) {

        // Calculate the maximum points per step by dividing maxPoints with the number of correct steps (edges)
        const stepMaxPoints = maxPoints / possibleSolution.length;
        let receivedPoints = 0;
        let feedback: string = '';
        let feedbackHTML: string = '';
        let violation = false; // Flag to indicate if there is a violation in the student's solution
        let lastEvaluatedIndex = 0;

        // Loop through each step in the student's solution
        for (let stepIndex = 0; stepIndex < studentNewEdgesByStep.length; stepIndex++) {
            lastEvaluatedIndex = stepIndex

            // Check if the number of steps in the student's solution exceeds the expected number of steps
            if (stepIndex >= possibleSolution.length) {
                feedback = 'Die Anzahl der Lösungsschritte überschreitet maximalen erwarteten Schritte.\n'
                feedback += `\n> Insgesamt erzielte Punkte: ${receivedPoints.toFixed(2)} / ${maxPoints}.`
                feedbackHTML = '<strong>Hinweis:</strong>.\n'
                feedbackHTML += 'Die Anzahl der Lösungsschritte überschreitet maximalen erwarteten Schritte.\n'
                feedbackHTML += `\n<strong>> Insgesamt erzielte Punkte:</strong> ${receivedPoints.toFixed(2)} / ${maxPoints}.`
                return {
                    feedback,
                    feedbackHTML,
                    receivedPoints: 0
                }
            }

            const studentNewEdges = studentNewEdgesByStep[stepIndex];
            const studentRemovedEdges = studentRemovedEdgesByStep[stepIndex];

            feedback += `Schritt ${stepIndex + 1}: `;
            feedbackHTML += `<strong>Schritt ${stepIndex + 1}:</strong> `;

            // Ensure that exactly one new edge is added in each step
            if (studentNewEdges.length !== 1) {
                feedback += 'In jedem Schritt muss genau eine neue Kante hinzugefügt werden.'
                feedback += '\n###############\n\n'
                feedbackHTML += 'In jedem Schritt muss genau eine neue Kante hinzugefügt werden.\n\n'
                violation = true;
                break;
            }

            // Ensure that no edges are removed in subsequent steps
            if (studentRemovedEdges.length > 0) {
                feedback += 'Hinzugefügte Kanten können in nächsten Schritten nicht gelöscht werden.'
                feedback += '\n###############\n\n'
                feedbackHTML += 'Hinzugefügte Kanten können in nächsten Schritten nicht gelöscht werden.\n\n'
                violation = true;
                break;
            }

            const studentNewEdge = studentNewEdges[0]
            const correctEdge = possibleSolution[stepIndex];
    
            // Compare the student's edge with the correct edge, considering undirected graph rules
            if (
                (studentNewEdge.node1Value !== correctEdge.node1Value || 
                studentNewEdge.node2Value !== correctEdge.node2Value) && 
                
                // Since it's an undirected graph, also check the reverse direction (A -> B) and (B -> A)
                (studentNewEdge.node1Value !== correctEdge.node2Value || 
                studentNewEdge.node2Value !== correctEdge.node1Value)
            ) {
                // The edge doesn't match
                feedback += '\n Es wurde nicht die korrekte Kante hinzugefügt.';
                feedback += '\n###############\n\n'
                feedbackHTML += '\n Es wurde nicht die korrekte Kante hinzugefügt.\n\n';
                violation = true;
                break;
            }

            // If the edge is correct, add points for this step
            receivedPoints += stepMaxPoints;
            feedback += '\n Der Lösungsschritt ist korrekt!'
            feedback += '\n###############\n\n'
            feedbackHTML += '\n Der Lösungsschritt ist korrekt!\n\n'
        }

        // If there was a violation, indicate that further steps are not evaluated
        if (violation && lastEvaluatedIndex < possibleSolution.length - 1) {
            feedback += 'Daher wurden die weiteren Schritte nicht bewertet.\n'
            feedbackHTML += '<strong>Hinweis:</strong>.\n'
            feedbackHTML += 'Daher wurden die weiteren Schritte nicht bewertet.\n'
        }
        else if (studentNewEdgesByStep.length < possibleSolution.length) {
            feedback += 'Die Lösung enthält weniger Schritte als erwartet.\n'
            feedbackHTML += '<strong>Hinweis:</strong>.\n'
            feedbackHTML += 'Die Lösung enthält weniger Schritte als erwartet.\n'
        }

        if (receivedPoints === maxPoints) {
            feedback = 'Die Lösung ist korrekt!\n'
            feedbackHTML = 'Die Lösung ist korrekt!\n'
        }

        // Provide total points and feedback
        feedback += `\n> Insgesamt erzielte Punkte: ${receivedPoints.toFixed(2)} / ${maxPoints}.`
        feedbackHTML += `\n<strong>> Insgesamt erzielte Punkte:</strong> ${receivedPoints.toFixed(2)} / ${maxPoints}.`

        return {
            possibleReceivedPoints: receivedPoints,
            possibleFeedback: feedback,
            possibleFeedbackHTML: feedbackHTML
        }
    }

    // ###########
    // #### Generate Possible Solutions

    // Initialize the Union-Find structure
    createUnionFind(elements: string[]): IUnionFind {
        const parentMap: { [key: string]: string } = {};  // Stores the parent of each node
        elements.forEach(element => (parentMap[element] = element)); // Initially, each element is its own parent
        return { parent: parentMap };
    }

    // Find operation for Union-Find: finds the root of the set containing 'element'
    findRoot(unionFind: IUnionFind, element: string): string {
        while (unionFind.parent[element] !== element) {  // Traverse up the tree to find the root
            element = unionFind.parent[element];
        }
        return element;  // Return the root element
    }

    // Union operation for Union-Find: merges the sets containing 'elementA' and 'elementB'
    unionSets(unionFind: IUnionFind, elementA: string, elementB: string): void {
        const rootA = this.findRoot(unionFind, elementA);  // Find root of elementA
        const rootB = this.findRoot(unionFind, elementB);  // Find root of elementB
        unionFind.parent[rootA] = rootB;  // Make rootB the parent of rootA, merging the sets
    }

    // Check if two elements belong to the same set
    areConnected(unionFind: IUnionFind, elementA: string, elementB: string): boolean {
        return this.findRoot(unionFind, elementA) === this.findRoot(unionFind, elementB);
    }

    // Clone Union-Find structure to create a deep copy
    cloneUnionFindStructure(unionFind: IUnionFind): IUnionFind {
        return { parent: { ...unionFind.parent } };  // Create a shallow copy of the parent map
    }

    // Recursive Kruskal's algorithm to generate all possible minimum spanning trees (MSTs)
    kruskalRecursive(
        remainingEdges: GraphEdgeSemanticDTO[],    // The remaining edges to process
        unionFind: IUnionFind,                     // Current union-find structure tracking connected components
        currentMST: GraphEdgeSemanticDTO[] = [],    // The current MST being built
        findOne: boolean = false                   // Flag to stop after finding one MST
    ): GraphEdgeSemanticDTO[][] {

        // Base case: no more edges to process
        if (remainingEdges.length === 0) {
            return [currentMST];  // Return the current MST as one of the possible solutions
        }

        // Sort edges by weight to always process the smallest available edge
        remainingEdges.sort((a, b) => a.weight - b.weight);

        let minWeightEdges: {
            candidateEdge: GraphEdgeSemanticDTO,  // A candidate edge to add to the MST
            otherEdges: GraphEdgeSemanticDTO[]    // Remaining edges after removing this candidate
        }[] = [];

        let minimumWeight = Infinity;

        // Identify all edges with the minimum weight and collect possible branching edges
        for (let i = 0; i < remainingEdges.length; i++) {
            const currentEdge = remainingEdges[i];

            if (currentEdge.weight < minimumWeight) {
                // New minimum weight found, clear the list and start fresh
                minimumWeight = currentEdge.weight;

                const remainingAfterRemoval = JSON.parse(JSON.stringify(remainingEdges));
                const edgeRemoved = remainingAfterRemoval.splice(i, 1)[0];

                minWeightEdges = [{
                    candidateEdge: edgeRemoved, 
                    otherEdges: remainingAfterRemoval 
                }];
            } else if (currentEdge.weight === minimumWeight) {
                // Collect multiple edges if they have the same minimum weight
                const remainingAfterRemoval = JSON.parse(JSON.stringify(remainingEdges));
                const edgeRemoved = remainingAfterRemoval.splice(i, 1)[0];

                minWeightEdges.push({
                    candidateEdge: edgeRemoved, 
                    otherEdges: remainingAfterRemoval
                });
            }
        }

        // To store all possible MSTs
        let allPossibleMSTs: GraphEdgeSemanticDTO[][] = [];

        // Recursively process each candidate minimum edge and continue building the MST
        for (const edgeGroup of minWeightEdges) {
            const clonedMST = JSON.parse(JSON.stringify(currentMST));
            const clonedUnionFind = this.cloneUnionFindStructure(unionFind);

            // Only add the edge if it connects two previously unconnected components
            if (!this.areConnected(clonedUnionFind, edgeGroup.candidateEdge.node1Value, edgeGroup.candidateEdge.node2Value)) {
                this.unionSets(clonedUnionFind, edgeGroup.candidateEdge.node1Value, edgeGroup.candidateEdge.node2Value);
                clonedMST.push(edgeGroup.candidateEdge);  // Add edge to the current MST
            }

            // Recursive call with the updated edge list, MST, and union-find structure
            const newMSTs = this.kruskalRecursive(edgeGroup.otherEdges, clonedUnionFind, clonedMST, findOne);
            
            // If `findOne` is true, return immediately if any solution is found
            if (findOne && newMSTs.length > 0) {
                return newMSTs;
            }

            allPossibleMSTs = allPossibleMSTs.concat(newMSTs);  // Collect all generated MSTs
        }

        return allPossibleMSTs;  // Return the full set of possible MSTs
    }

    // Initialize Kruskal's algorithm to generate all possible solutions
    generatePossibleMSTs(edges: GraphEdgeSemanticDTO[], findOne: boolean = false): GraphEdgeSemanticDTO[][] {
        // Create a set of all unique nodes in the graph
        const uniqueNodes = new Set(edges.map(e => [e.node1Value, e.node2Value]).flat());

        // Initialize the union-find structure for the unique nodes
        const unionFind = this.createUnionFind(Array.from(uniqueNodes));

        // Start the recursive generation of possible MSTs
        return this.kruskalRecursive(edges, unionFind, [], findOne);
    }    

}

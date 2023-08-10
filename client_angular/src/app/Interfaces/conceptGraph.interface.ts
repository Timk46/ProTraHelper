import { ConceptEdge } from "./conceptEdge.interface";
import { ConceptNode } from "./conceptNode.interface";
// interfaces relating to the concept graph

export interface ConceptGraph {
    id: number; // id in the graph table
    name: string;
    trueRootId: string; // in the graph the id of the root node has to be 'root'.
                        // so we need to store the id of the true root node here
    nodeMap: Record<string, ConceptNode>;
    edgeMap: Record<string, ConceptEdge>;  
    currentConceptId?: string; // id of the last concept that was clicked on
}
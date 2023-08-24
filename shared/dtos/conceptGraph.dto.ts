import { ConceptEdgeDTO } from "./conceptEdge.dto";
import { ConceptNodeDTO } from "./conceptNode.dto";
// interfaces relating to the concept graph

export interface ConceptGraphDTO {
    id: number; // id in the graph table
    name: string;
    trueRootId: number; // in the graph the id of the root node has to be 'root'.
                        // so we need to store the id of the true root node here
    nodeMap: Record<number, ConceptNodeDTO>;
    edgeMap: Record<number, ConceptEdgeDTO>;  
    currentConceptId?: number; // id of the last concept that was clicked on
}
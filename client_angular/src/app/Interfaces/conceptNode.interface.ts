import { Expandable } from "sprotty";
import { SNode } from "sprotty-protocol"

// interface for concept nodes
// needed for sprotty
export interface ConceptNode extends SNode, Expandable {
    // inherited mandatory fields from SNode:
    // id: string; // node_ + string der Datenbank-id, außer für die root node (id: 'root')
    // type: string; // z.B. 'node:concept'

    // neu:
    name: string ;
    expanded: boolean;
    level?: number;
    // helper fields
    parentIds?: string[];
    childIds?: string[];
    prerequisiteEdgeIds?: string[];
    successorEdgeIds?: string[];
    edgeChildIds?: string[];
}


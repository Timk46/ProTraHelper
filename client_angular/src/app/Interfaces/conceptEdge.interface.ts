import { SEdge } from "sprotty-protocol"

// interface for concept edges
// needed for sprotty
export interface ConceptEdge extends SEdge {
    //inherited mandatory fields from SEdge:
    //id: string; // edge_ + string der Datenbank-id
    //type: string; // z.B. 'edge:concept'
    //sourceId: string;
    //targetId: string;

    //
    parentId: string;
}
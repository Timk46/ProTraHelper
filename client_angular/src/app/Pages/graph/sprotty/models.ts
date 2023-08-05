import { Expandable } from "sprotty";
import { SNode } from "sprotty-protocol"

export interface ConceptNode extends SNode, Expandable {
    name: string ;
    expanded: boolean;
    level: number;
}
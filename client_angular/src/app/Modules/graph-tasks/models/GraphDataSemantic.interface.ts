import { IGraphEdgeSemantic } from "./GraphEdgeSemantic.interface";
import { IGraphNodeSemantic } from "./GraphNodeSemantic.interface";

export interface IGraphDataSemantic {
    nodes: IGraphNodeSemantic[];
    edges: IGraphEdgeSemantic[];
}
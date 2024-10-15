import { IGraphEdge } from "./GraphEdge.interface";
import { IGraphNode } from "./GraphNode.interface";

export interface IGraphStructure {
    nodes: IGraphNode[];
    edges: IGraphEdge[];
}
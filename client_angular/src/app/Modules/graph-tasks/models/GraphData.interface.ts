import { IGraphEdge } from "./GraphEdge.interface";
import { IGraphNode } from "./GraphNode.interface";

export interface IGraphData {
    nodes: IGraphNode[];
    edges: IGraphEdge[];
}
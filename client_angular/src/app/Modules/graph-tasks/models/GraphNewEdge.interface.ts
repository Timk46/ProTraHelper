import { IGraphNode } from "./GraphNode.interface";

export interface IGraphNewEdge {
    started: boolean;
    node1: IGraphNode | null; // startNode for directed edges
    node2: IGraphNode | null; // endNode for directed edges
    weight: number;
}
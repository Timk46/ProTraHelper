import { IGraphNode } from "./GraphNode.interface";

export interface IGraphEdge {
    node1: IGraphNode, // startNode for directed edges
    node2: IGraphNode, // endNode for directed edges
    directed: boolean,
    weight: {
        enabled: boolean,
        value: number | null
    }
}
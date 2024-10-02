export interface IGraphEdgeSemantic {
    node1Value: string; // startNode for directed edges
    node2Value: string; // endNode for directed edges
    weight?: number;
}
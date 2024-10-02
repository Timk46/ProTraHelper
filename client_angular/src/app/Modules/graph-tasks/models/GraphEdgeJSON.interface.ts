export interface IGraphEdgeJSON {
    node1Id: number; // startNode for directed edges
    node2Id: number; // endNode for directed edges
    weight: number | null;
}

export function isGraphEdgeJSON(obj: any): obj is IGraphEdgeJSON {
    return obj &&
    typeof obj.node1Id === 'number' &&
    typeof obj.node2Id === 'number' &&
    (obj.weight === null || typeof obj.weight === 'number');
}
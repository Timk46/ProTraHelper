import { IGraphEdgeJSON, isGraphEdgeJSON } from "./GraphEdgeJSON.interface";
import { IGraphNodeJSON, isGraphNodeJSON } from "./GraphNodeJSON.interface";

export interface IGraphDataJSON {
    nodes: IGraphNodeJSON[];
    edges: IGraphEdgeJSON[];
}


export function isGraphDataJSON(obj: any): obj is IGraphDataJSON {
    return obj &&
    Array.isArray(obj.edges) &&
    obj.edges.every((edge: any) => isGraphEdgeJSON(edge)) &&
    Array.isArray(obj.nodes) &&
    obj.nodes.every((node: any) => isGraphNodeJSON(node));
}

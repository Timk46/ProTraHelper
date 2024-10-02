import { IPosition, isPosition } from "./Position.interface";
import { ISize, isSize } from "./Size.interface";

export interface IGraphNodeJSON {
    nodeId: number;
    value: string;
    visited: boolean | null;
    weight: number | null;
    position: IPosition;
    size: ISize;
    center: IPosition;
}

export function isGraphNodeJSON(obj: any): obj is IGraphNodeJSON {
    return obj &&
    typeof obj.nodeId === 'number' &&
    typeof obj.value === 'string' &&
    (obj.visited === null || typeof obj.visited === 'boolean') &&
    (obj.weight === null || typeof obj.weight === 'number') &&
    isPosition(obj.position) &&
    isSize(obj.size) &&
    isPosition(obj.center);
}
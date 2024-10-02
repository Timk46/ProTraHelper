import { IPosition, isPosition } from "./Position.interface";
import { ISize, isSize } from "./Size.interface";

export interface IBstNodeJSON {
    nodeId: number;
    value: string;
    leftChild: IBstNodeJSON | null;
    rightChild: IBstNodeJSON | null;
    position: IPosition;
    size: ISize;
    center: IPosition;
}

export function isBstNodeJSON(obj: any): obj is IBstNodeJSON {
    return obj &&
    typeof obj.nodeId === 'number' &&
    typeof obj.value === 'string' &&
    (obj.leftChild === null || isBstNodeJSON(obj.leftChild)) &&
    (obj.rightChild === null || isBstNodeJSON(obj.rightChild)) &&
    isPosition(obj.position) &&
    isSize(obj.size) &&
    isPosition(obj.center);
}


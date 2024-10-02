import { IPosition } from "./Position.interface";
import { ISize } from "./Size.interface";

export interface IBstNode {
    nodeId: number;
    value: string;
    parent: IBstNode | null;
    leftChild: IBstNode | null;
    rightChild: IBstNode | null;
    position: IPosition;
    size: ISize;
    center: IPosition;
}


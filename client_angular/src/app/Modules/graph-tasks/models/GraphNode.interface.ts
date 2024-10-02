import { IPosition } from "./Position.interface";
import { ISize } from "./Size.interface";

export interface IGraphNode {
    nodeId: number;
    value: string;
    visited: {
        enabled: boolean,
        value: boolean | null,
    };
    weight: {
        enabled: boolean,
        value: number | null
    },
    position: IPosition;
    size: ISize;
    center: IPosition;
}
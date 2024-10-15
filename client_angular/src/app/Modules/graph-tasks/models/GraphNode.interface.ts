import { PositionDTO, SizeDTO } from "@DTOs/graphTask.dto";

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
    position: PositionDTO;
    size: SizeDTO;
    center: PositionDTO;
}
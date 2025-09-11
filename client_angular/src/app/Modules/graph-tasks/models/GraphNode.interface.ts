import { PositionDTO, SizeDTO } from '@DTOs/index';

export interface IGraphNode {
  nodeId: number;
  value: string;
  selected: {
    enabled: boolean;
    value: boolean | null;
  };
  weight: {
    enabled: boolean;
    value: number | null;
  };
  position: PositionDTO;
  size: SizeDTO;
  center: PositionDTO;
}

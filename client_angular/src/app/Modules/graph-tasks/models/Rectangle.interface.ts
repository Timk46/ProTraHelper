import { IPosition } from "./Position.interface";
import { ISize } from "./Size.interface";

export interface IRectangle {
    topLeft: IPosition;
    bottomRight: IPosition;
    size: ISize;
  }
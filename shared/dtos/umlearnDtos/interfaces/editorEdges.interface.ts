import { EditorElement } from "../dtos/index";
import { Side } from "./UMLines.interface";

export interface ClassEdge {
  identification: string;
  type: EditorElement;
  id: string;
  start: string;
  end: string;
  startDirection?: Side,
  startDirectionOffset?: number,
  endDirection?: Side,
  endDirectionOffset?: number,
  cardinalityStart?: string;
  description?: string;
  cardinalityEnd?: string;
  highlighted?: {code: string, added?: ClassEdgeHighlightContent, deleted?: ClassEdgeHighlightContent, updated?: ClassEdgeHighlightContent};
}

export interface ClassEdgeHighlightContent {
  type?: EditorElement;
  start?: string;
  end?: string;
  cardinalityStart?: string;
  description?: string;
  cardinalityEnd?: string;
}

export interface EdgeMatch {
  solutionEdge: ClassEdge;
  attemptEdge: ClassEdge;
}
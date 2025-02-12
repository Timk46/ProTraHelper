import { Side } from "./UMLines.interface";

export interface UmlEditorData {
  diagramType: string;
  nodes: UmlNode[];
  edges: UmlEdge[];
  missingNodes?: UmlNode[];
  missingEdges?: UmlEdge[];
  metadata?: UmlEditorDataMetadata;
}

export interface UmlEditorDataMetadata {
  createdAt: Date;
  updatedAt: Date;
  author: string;
}

export interface UmlNode {
  id: string;
  type: string;
  title: string;
  attributes: UmlNodeAttribute[];
  methods: UmlNodeMethod[];
  metadata?: UmlNodeMetadata;
}

export interface UmlNodeAttribute {
  name: string;
  dataType: string;
  visibility: string;
}

export interface UmlNodeMethod {
  name: string;
  returnType: string;
  parameters: UmlNodeMethodParameter[];
  visibility: string;
}

export interface UmlNodeMethodParameter {
  name: string;
  dataType: string;
}

export interface UmlNodeMetadata {
  position: {x: number, y: number};
  width: number;
  height: number;
}

export interface UmlEdge {
  id: string;
  type: string;
  start: string;
  end: string;
  cardinalityStart: string;
  description: string;
  cardinalityEnd: string;
  metadata?: UmlEdgeMetadata;
}

export interface UmlEdgeMetadata {
  startDirection: Side,
  startDirectionOffset: number,
  endDirection: Side,
  endDirectionOffset: number,
}
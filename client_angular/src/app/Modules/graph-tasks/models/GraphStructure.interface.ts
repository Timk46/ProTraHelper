import type { IGraphEdge } from './GraphEdge.interface';
import type { IGraphNode } from './GraphNode.interface';

export interface IGraphStructure {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
}

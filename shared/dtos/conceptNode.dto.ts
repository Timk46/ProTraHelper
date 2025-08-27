// generic interface for a node in the concept graph
export interface ConceptNodeDTO {
  databaseId: number;
  name: string;
  level?: number;
  goal?: number;
  expanded?: boolean;
  description?: string;
  descriptionHTML?: string;
  parentIds: number[];
  childIds: number[];
  prerequisiteEdgeIds: number[];
  successorEdgeIds: number[];
  edgeChildIds: number[];
}

export interface ConceptNode {
  id: number;
  name: string;
  description: string | null;
  descriptionHTML?: string;
  conceptGraphId: number | null;
}

// generic interface for a node in the concept graph
export interface ConceptNodeDTO {
    databaseId: number;
    name: string;
    level?: number;
    expanded?: boolean;

    parentIds: number[];
    childIds: number[];
    prerequisiteEdgeIds: number[];
    successorEdgeIds: number[];
    edgeChildIds: number[];
}


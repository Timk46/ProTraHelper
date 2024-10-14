export interface GraphStructureDTO {
    nodes: GraphNodeDTO[],
    edges: GraphEdgeDTO[],
}

export interface GraphConfigurationDTO {
    nodeWeight: boolean,
    nodeVisited: boolean,
    edgeWeight: boolean
    edgeDirected: boolean,
}

export interface GraphNodeDTO {
    nodeId: number;
    value: string;
    visited: boolean | null;
    weight: number | null;
    position: PositionDTO;
    size: SizeDTO;
    center: PositionDTO;
}

export interface GraphEdgeDTO {
    node1Id: number; // startNode for directed edges
    node2Id: number; // endNode for directed edges
    weight: number | null;
}

export interface PositionDTO {
    x: number;
    y: number;
}

export interface SizeDTO {
    width: number;
    height: number;
}

// DTOs for question evaluation (can be removed if base DTOs are improved)
export interface GraphStructureSemanticDTO {
    nodes: GraphNodeSemanticDTO[],
    edges: GraphEdgeSemanticDTO[],
}

export interface GraphNodeSemanticDTO {
    value: string;
    visited?: boolean;
    weight?: number;
}

export interface GraphEdgeSemanticDTO {
    node1Value: string; // startNode for directed edges
    node2Value: string; // endNode for directed edges
    weight?: number;
}
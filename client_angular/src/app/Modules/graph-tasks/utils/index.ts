import { IGraphStructure } from "../models/GraphStructure.interface";
import { IGraphEdge } from "../models/GraphEdge.interface";
import { IGraphNode } from "../models/GraphNode.interface";
import { 
  PositionDTO, SizeDTO, 
  GraphNodeSemanticDTO, GraphNodeDTO, 
  GraphEdgeSemanticDTO, GraphEdgeDTO, 
  GraphStructureSemanticDTO, GraphStructureDTO 
} from "@DTOs/graphTask.dto";

export function calculateShapeCenter(position: PositionDTO, size: SizeDTO): PositionDTO {
    const center: PositionDTO = {
      x: position.x + (size.width / 2),
      y: position.y + (size.height / 2)
    };
    return center;
}


export function calculateLineCenter(from: PositionDTO, to: PositionDTO, size: SizeDTO, align: 0 | 1 | 2): PositionDTO{
    let x = (from.x + to.x - size.width) / 2;
    let y = (from.y + to.y - size.height) / 2;

    if (align === 0) { return { x, y }; }

    // Calculate the perpendicular shift vector
    // Calculate the difference between node centers
    const diffX = to.x - from.x;
    const diffY = to.y - from.y;

    // Calculate the perpendicular vector
    const perpendicularX = -diffY;
    const perpendicularY = diffX;

    // Normalize the perpendicular vector
    const perpendicularDistance = Math.sqrt(perpendicularX * perpendicularX + perpendicularY * perpendicularY);
    const normPerpendicularX = perpendicularX / perpendicularDistance;
    const normPerpendicularY = perpendicularY / perpendicularDistance;
  
    // If align is 1 or 2, adjust the start point perpendicularly
    const perpendicularShift = 20; // Adjust this value to control spacing
    x += normPerpendicularX * perpendicularShift;
    y += normPerpendicularY * perpendicularShift;

    return { x, y };
}

export function calculateEdgeStart(from: IGraphNode, to: IGraphNode, align: 0 | 1 | 2): PositionDTO {
    // Calculate the distance between the center of two nodes
    const diffX = to.center.x - from.center.x;
    const diffY = to.center.y - from.center.y;
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);

    // Handle edge case where the distance is zero to avoid division by zero
    if (distance === 0) { 
      return from.center; 
    }

    // Calculate the distance to the boundary so that the edge start is visible
    let distanceToBoundary;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        distanceToBoundary = from.size.width / 2;
    } else {
        distanceToBoundary = from.size.height / 2;
    }

    // Add 20 units to the boundary distance to extend the edge outside the node
    const extendedDistance = distanceToBoundary + 10;
    
    // Return the position for the start of the edge
    let x = from.center.x + (diffX * extendedDistance) / distance;
    let y = from.center.y + (diffY * extendedDistance) / distance;

    // Calculate the perpendicular shift vector
    const { normPerpendicularX, normPerpendicularY } = calculatePerpendicularVector(from, to);

    // If align is 1 or 2, adjust the start point perpendicularly
    if (align !== 0) {
        const perpendicularShift = 20; // Adjust this value to control spacing
        x += normPerpendicularX * perpendicularShift;
        y += normPerpendicularY * perpendicularShift;
    }

    return { x, y };
}

export function calculateEdgeEnd(from: IGraphNode, to: IGraphNode, align: 0 | 1 | 2) {
    // Calculate the distance between the center of two nodes
    const diffX = from.center.x - to.center.x;
    const diffY = from.center.y - to.center.y;
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);

    // Handle edge case where the distance is zero to avoid division by zero
    if (distance === 0) { 
      return to.center; 
    }
    
    // Calculate the distance to the boundary so that the arrow head is visible
    let distanceToBoundary;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        distanceToBoundary = to.size.width / 2;
    } else {
        distanceToBoundary = to.size.height / 2;
    }

    // Add 20 units to the boundary distance to extend the edge outside the node
    const extendedDistance = distanceToBoundary + 10;
    
    // Return the position for the end of the edge
    let x = to.center.x + (diffX * extendedDistance) / distance;
    let y = to.center.y + (diffY * extendedDistance) / distance;

    // Calculate the perpendicular shift vector
    const { normPerpendicularX, normPerpendicularY } = calculatePerpendicularVector(from, to);

    // If align is 1 or 2, adjust the end point perpendicularly
    if (align !== 0) {
        const perpendicularShift = 20; // Adjust this value to control spacing
        x += normPerpendicularX * perpendicularShift;
        y += normPerpendicularY * perpendicularShift;
    }

    return { x, y };
}

function calculatePerpendicularVector(from: IGraphNode, to: IGraphNode) {
  // Calculate the difference between node centers
  const diffX = to.center.x - from.center.x;
  const diffY = to.center.y - from.center.y;

  // Calculate the perpendicular vector
  const perpendicularX = -diffY;
  const perpendicularY = diffX;

  // Normalize the perpendicular vector
  const perpendicularDistance = Math.sqrt(perpendicularX * perpendicularX + perpendicularY * perpendicularY);
  const normPerpendicularX = perpendicularX / perpendicularDistance;
  const normPerpendicularY = perpendicularY / perpendicularDistance;

  return { normPerpendicularX, normPerpendicularY };
}

export function calculateArrowPoints(from: IGraphNode, to: IGraphNode, align: 0 | 1 | 2) {
    // Specify where the arrowhead starts and ends
    let start: PositionDTO;  
    let end: PositionDTO;  
    if (from === to) { // connects the node with itself
      const xOffset = 30;
      const yOffset = -10;
      start = { x: from.position.x + xOffset, y: from.position.y - 100 }; // -100 is not important it is just to specify the direction
      end = { x: from.position.x + xOffset, y: from.position.y + yOffset };
    } else {
      start = from.center; // to specify the direction of the startpoint
      end = calculateEdgeEnd(from, to, align);  
    }
    
    // Size of the arrowhead
    const arrowSize = 15; 

    // Angle of the edgeline
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    // Points for the triangle (arrowhead)
    const p1 = { x: end.x, y: end.y };
    const p2 = {
      x: end.x - arrowSize * Math.cos(angle - Math.PI / 6),
      y: end.y - arrowSize * Math.sin(angle - Math.PI / 6)
    };
    const p3 = {
      x: end.x - arrowSize * Math.cos(angle + Math.PI / 6),
      y: end.y - arrowSize * Math.sin(angle + Math.PI / 6)
    };

    // Return the points
    return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
}

export function calculateSelfLoopPath(edge: IGraphEdge): string {
    
    // Start position of the edge
    const x = edge.node1.position.x;
    const y = edge.node2.position.y;
    
    // Loop Properties
    const radius = 20;
    const controlPointOffset = 0.55 * radius;

    // Construct the SVG path for a self-loop
    return `
      M ${x - 10} ${y + 30}
      C ${x - 100} ${y + 30},
        ${x + 30} ${y - 100},
        ${x + 30} ${y - 10}
    `;
}



export function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: any) => {
      const fileContent = e.target.result;
      resolve(fileContent);
    };
  
    reader.readAsText(file);
  });
}

export function downloadJSON(content: any, fileName: string = 'data') {
  const json = JSON.stringify(content, null, 2);
  
  const blob = new Blob([json], { type: 'application/json' });
  
  // download
  const link = document.createElement('a');
  link.download = `${fileName}.json`;
  link.href = window.URL.createObjectURL(blob);
  link.click();
  
  // Clean up
  window.URL.revokeObjectURL(link.href);
}

// ############################### 
// ############ graph ############ 

// Graph -> Semantic
export function graphToSemantic(graphData: IGraphStructure): GraphStructureSemanticDTO {
  const nodesSemantic: GraphNodeSemanticDTO[] = [];
  const edgesSemantic: GraphEdgeSemanticDTO[] = [];

  graphData.nodes.forEach( node => {
    const nodeSemantic: GraphNodeSemanticDTO = graphNodeToSemantic(node);
    nodesSemantic.push(nodeSemantic);
  });

  graphData.edges.forEach( edge => {
    const edgeSemantic: GraphEdgeSemanticDTO = graphEdgeToSemantic(edge);
    edgesSemantic.push(edgeSemantic);
  });

  return {
    nodes: nodesSemantic,
    edges: edgesSemantic
  };
}

export function graphNodeToSemantic(node: IGraphNode): GraphNodeSemanticDTO {
  const nodeSemantic: GraphNodeSemanticDTO = {
    value: node.value,
  };

  if (node.weight.enabled && node.weight.value !== null) {
    nodeSemantic.weight = node.weight.value;
  }
  if (node.selected.enabled && node.selected.value !== null) {
    nodeSemantic.selected = node.selected.value;
  }

  return nodeSemantic;
}

export function graphEdgeToSemantic(edge: IGraphEdge): GraphEdgeSemanticDTO {
  const edgeSemantic: GraphEdgeSemanticDTO = {
    node1Value: edge.node1.value,
    node2Value: edge.node2.value,
  };

  if (edge.weight.enabled &&  edge.weight.value !== null) {
    edgeSemantic.weight = edge.weight.value;
  }

  return edgeSemantic;
}


// GraphJSON -> Semantic
export function graphJSONToSemantic(graphData: GraphStructureDTO): GraphStructureSemanticDTO {
  const nodesSemantic: GraphNodeSemanticDTO[] = [];
  const edgesSemantic: GraphEdgeSemanticDTO[] = [];

  graphData.nodes.forEach( node => {
    const nodeSemantic: GraphNodeSemanticDTO = graphNodeJSONToSemantic(node);
    nodesSemantic.push(nodeSemantic);
  });

  graphData.edges.forEach( edge => {
    const edgeSemantic: GraphEdgeSemanticDTO = graphEdgeJSONToSemantic(edge, graphData.nodes);
    edgesSemantic.push(edgeSemantic);
  });

  return {
    nodes: nodesSemantic,
    edges: edgesSemantic
  };
}

export function graphNodeJSONToSemantic(node: GraphNodeDTO): GraphNodeSemanticDTO {
  const nodeSemantic: GraphNodeSemanticDTO = {
    value: node.value,
  };

  if (node.weight !== null) {
    nodeSemantic.weight = node.weight;
  }
  if (node.selected !== null) {
    nodeSemantic.selected = node.selected;
  }

  return nodeSemantic;
}

export function graphEdgeJSONToSemantic(edge: GraphEdgeDTO, nodesList: GraphNodeDTO[]): GraphEdgeSemanticDTO {
  let node1Value: string = 'no-value'
  let node2Value: string = 'no-value'
  nodesList.forEach(node => {
    if (node.nodeId === edge.node1Id) {
      node1Value = node.value;
    }
    if (node.nodeId === edge.node2Id) {
      node2Value = node.value;
    }
  });

  const edgeSemantic: GraphEdgeSemanticDTO = {
    node1Value: node1Value,
    node2Value: node2Value,
  };

  if (edge.weight !== null) {
    edgeSemantic.weight = edge.weight;
  }

  return edgeSemantic;
}
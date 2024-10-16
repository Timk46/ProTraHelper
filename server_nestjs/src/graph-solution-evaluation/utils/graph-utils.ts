import { GraphStructureDTO, GraphStructureSemanticDTO, GraphEdgeDTO, GraphEdgeSemanticDTO, GraphNodeDTO, GraphNodeSemanticDTO } from "@DTOs/graphTask.dto";

/**
 * Checks if two graphs are identical by comparing their nodes and edges.
 *
 * This function compares two graphs, `graph1` and `graph2`, to determine if they are identical. 
 * It checks if both graphs have the same number of nodes and edges. Then, it verifies that every 
 * node in `graph1` exists in `graph2` and vice versa, and that every edge in `graph1` exists in 
 * `graph2` and vice versa.
 *
 * @param {GraphStructureSemanticDTO} graph1 - The first graph to compare.
 * @param {GraphStructureSemanticDTO} graph2 - The second graph to compare.
 * @returns {boolean} - Returns `true` if the graphs are identical (same nodes and edges), otherwise `false`.
 */
export function graphsIdentical(graph1: GraphStructureSemanticDTO, graph2: GraphStructureSemanticDTO): boolean {

    // Check if the number of nodes and edges are the same
    if (graph1.nodes.length !== graph2.nodes.length || graph1.edges.length !== graph2.edges.length) {
      return false;
    }

    // Check if all nodes in graph1 are in graph2
    for (const node1 of graph1.nodes) {
      const matchingNode = graph2.nodes.find(node2 => nodesHaveSameValue(node1, node2));
      if (!matchingNode) {
        return false;
      }
    }
    // Check if all nodes in graph2 are in graph1
    for (const node2 of graph2.nodes) {
      const matchingNode = graph1.nodes.find(node1 => nodesHaveSameValue(node2, node1));
      if (!matchingNode) {
        return false;
      }
    }

    // Check if all edges in graph1 are in graph2
    for (const edge1 of graph1.edges) {
      const matchingEdge = graph2.edges.find(edge2 => edgesConnectNodesWithSameValues(edge1, edge2));
      if (!matchingEdge) {
        return false;
      }
    }

    // Check if all edges in graph2 are in graph1
    for (const edge2 of graph2.edges) {
      const matchingEdge = graph1.edges.find(edge1 => edgesConnectNodesWithSameValues(edge2, edge1));
      if (!matchingEdge) {
        return false;
      }
    }

    return true;
}



/**
 * Checks if two graphs contain the same set of nodes, regardless of their order.
 *
 * This function determines if `graph1` and `graph2` contain the same nodes by 
 * comparing the sorted list of node values from both graphs. It first extracts 
 * the node values from each graph, sorts them, and then compares the sorted lists. 
 * If the lengths differ or any value does not match, the graphs do not contain 
 * the same nodes.
 *
 * @param {GraphStructureSemanticDTO} graph1 - The first graph to compare.
 * @param {GraphStructureSemanticDTO} graph2 - The second graph to compare.
 * @returns {boolean} - Returns `true` if both graphs contain the same set of nodes, otherwise `false`.
 */
export function graphsContainSameNodes(graph1: GraphStructureSemanticDTO, graph2: GraphStructureSemanticDTO): boolean {
    
    function extractAndSortNodeValues(graph: GraphStructureSemanticDTO) {
      return graph.nodes.map(node => node.value).sort();
    }

    const graph1Values = extractAndSortNodeValues(graph1);
    const graph2Values = extractAndSortNodeValues(graph2);

    if (graph1Values.length !== graph2Values.length) {
        return false;
    }

    for (let i = 0; i < graph1Values.length; i++) {
        if (graph1Values[i] !== graph2Values[i]) {
            return false;
        }
    }

    return true;
}

/**
 * Identifies edges in the first graph that are not present in the second graph.
 *
 * This function compares two lists of edges, `edgesGraph1` and `edgesGraph2`, and 
 * returns a list of edges that are present in `edgesGraph1` but not in `edgesGraph2`.
 * It iterates through each edge in `edgesGraph1` and checks if there is a matching 
 * edge in `edgesGraph2` using the `compareEdges` method. If no matching edge is found, 
 * the edge is considered an "extra" edge and added to the result list.
 *
 * @param {GraphEdgeSemanticDTO[]} edgesGraph1 - The list of edges from the first graph.
 * @param {GraphEdgeSemanticDTO[]} edgesGraph2 - The list of edges from the second graph.
 * @returns {GraphEdgeSemanticDTO[]} - Returns an array of edges that are present in `edgesGraph1` but not in `edgesGraph2`.
 */
export function getExtraEdges(edgesGraph1: GraphEdgeSemanticDTO[], edgesGraph2: GraphEdgeSemanticDTO[]): GraphEdgeSemanticDTO[] {
    const extraEdges: GraphEdgeSemanticDTO[] = [];

    for (const edge1 of edgesGraph1) {
      const matchingEdge = edgesGraph2.find(edge2 => edgesConnectNodesWithSameValues(edge1, edge2));
      if (!matchingEdge) {
        extraEdges.push(edge1);
      }
    }
  
    return extraEdges;
}

/**
 * Checks if two graph nodes have the same value.
 *
 * This function compares two graph nodes, `node1` and `node2`, and returns `true` 
 * if they have the same `value` property. The comparison does not consider other 
 * properties such as `visited` or `weight`.
 *
 * @param {GraphNodeSemanticDTO} node1 - The first graph node to compare.
 * @param {GraphNodeSemanticDTO} node2 - The second graph node to compare.
 * @returns {boolean} - Returns `true` if both nodes have the same value, otherwise `false`.
 */
export function nodesHaveSameValue(node1: GraphNodeSemanticDTO, node2: GraphNodeSemanticDTO) {
    return node1.value === node2.value;
};

/**
 * Checks if two directed edges connect nodes with the same values.
 *
 * This function compares two directed graph edges, `edge1` and `edge2`, and returns `true`
 * if both edges connect the same pair of nodes based on their `node1Value` and `node2Value` properties.
 * It does not consider other properties like `weight`.
 *
 * @param {GraphEdgeSemanticDTO} edge1 - The first edge to compare.
 * @param {GraphEdgeSemanticDTO} edge2 - The second edge to compare.
 * @returns {boolean} - Returns `true` if both edges connect nodes with the same values, otherwise `false`.
 */
export function edgesConnectNodesWithSameValues(edge1: GraphEdgeSemanticDTO, edge2: GraphEdgeSemanticDTO) {
    return (
      edge1.node1Value === edge2.node1Value &&
      edge1.node2Value === edge2.node2Value
    );
};


/**
 * Checks if the graphs contain only edges which connect the same nodes.
 * It is not considered whether other edge attributes are different.
 * This function is for graphs with undirected edges.
 * @param graph1 
 * @param graph2 
 */
export function graphsContainSameEdges(graph1: GraphStructureSemanticDTO, graph2: GraphStructureSemanticDTO) {

  function extractAndSortEdges(graph: GraphStructureSemanticDTO) {
    return graph.edges.map( edge => {
      // Ensure the smaller value is always node1Value and the larger value is node2Value 
      // Reuqired to treat edges as undirected
      const [node1Value, node2Value] = edge.node1Value.localeCompare(edge.node2Value) < 0 ?
        [edge.node1Value, edge.node2Value] : [edge.node2Value, edge.node1Value];
        return { node1Value, node2Value };

      // Sort the edges first by node1Value and then by node2Value
      }).sort((a, b) => {
        if (a.node1Value === b.node1Value) {
          return a.node2Value.localeCompare(b.node2Value);
        }
        return a.node1Value.localeCompare(b.node1Value);
    });
  }

  // Extract and sort edges for both graphs
  const graph1Edges = extractAndSortEdges(graph1);
  const graph2Edges = extractAndSortEdges(graph2);

  // Check if the number of edges is the same in both graphs
  if (graph1Edges.length !== graph2Edges.length) {
    return false;
  }

  // Check if all edges are the same in both graphs
  for (let i = 0; i < graph1Edges.length; i++) {
    if (graph1Edges[i].node1Value !== graph2Edges[i].node1Value ||
      graph1Edges[i].node2Value !== graph2Edges[i].node2Value) {
      return false;
    }
  }

  // If all checks pass, return true
  return true;
}


/**
 * Returns the list of nodes with visited attribute set to true
 * @param nodes Array of nodes to check
 * @returns {GraphNodeSemanticDTO[]} Nodes with visited attribute true
 */
export function getVisitedNodes(nodes: GraphNodeSemanticDTO[]): GraphNodeSemanticDTO[] {
  return nodes.filter(node => node.visited);
}

/**
 * Returns the list of extra visited nodes in graph1 that are not visited in graph2
 * @param nodesGraph1 Nodes to check
 * @param nodesGraph2 Reference nodes
 * @returns {GraphNodeSemanticDTO[]} Extra visited nodes
 */
export function getExtraVisitedNodes(nodesGraph1: GraphNodeSemanticDTO[], nodesGraph2: GraphNodeSemanticDTO[]): GraphNodeSemanticDTO[] {
  const extraVisitedNodes = [];

  for (const node1 of nodesGraph1) {
    if (node1.visited) {
      const matchingNode = nodesGraph2.find(node2 => node1.value === node2.value);
      if (matchingNode && !matchingNode.visited) {
        extraVisitedNodes.push(node1);
      }
    }
  }

  return extraVisitedNodes;
}


/**
 * Returns the list of node value for the nodes with different weights between two node lists
 * @param nodesGraph1 Array of nodes from the first graph
 * @param nodesGraph2 Array of nodes from the second graph
 * @returns {Array<string>} Node values for the nodes with different weights
 */
export function getNodesWithDifferentWeights(nodesGraph1: GraphNodeSemanticDTO[], nodesGraph2: GraphNodeSemanticDTO[]): string[] {
  const nodesWithDifferentWeights: string[] = [];

  for (const node1 of nodesGraph1) {
    const matchingNode = nodesGraph2.find(node2 => node1.value === node2.value);
    if (matchingNode && node1.weight !== matchingNode.weight) {
      nodesWithDifferentWeights.push(node1.value);
    }
  }

  return nodesWithDifferentWeights;
}


/**
 * Returns the list of edge value for the edges with different weights between two edge lists
 * @param edgesGraph1 Array of edges from the first graph
 * @param edgesGraph2 Array of edges from the second graph
 * @returns {Array<string>} Edge values for the edges with different weights as string like: 'A -> B'
 */
export function getEdgesWithDifferentWeights(edgesGraph1: GraphEdgeSemanticDTO[], edgesGraph2: GraphEdgeSemanticDTO[]): string[] {
  const edgesWithDifferentWeights: string[] = [];
  
  for (const edge1 of edgesGraph1) {
    const matchingEdge = edgesGraph2.find(edge2 => edge1.node1Value === edge2.node1Value && edge1.node2Value === edge2.node2Value);
      if (matchingEdge && edge1.weight !== matchingEdge.weight) {
        edgesWithDifferentWeights.push(`${edge1.node1Value} -> ${edge1.node2Value}`);
      }
  }
  return edgesWithDifferentWeights;
}


// #####
// Convert GraphJSON to GraphSemantic


/**
 * Converts graph data from IGraphDataJSON type to IGraphDataSemantic format.
 *
 * This function takes a graph represented in IGraphDataJSON type, which includes nodes and edges,
 * and converts each node and edge to a semantic format that is easier to work with programmatically.
 * The conversion is done by transforming nodes and edges individually using helper functions.
 *
 * @param {GraphStructureDTO} graphData - The graph data as IGraphDataJSON, containing nodes and edges.
 * @returns {GraphStructureSemanticDTO} - The graph data as IGraphDataSemantic, containing nodes and edges.
 */
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
 
/**
 * Converts a graph node from IGraphNodeJSON type to IGraphNodeSemantic type.
 *
 * @param {GraphNodeDTO} node - The graph node as IGraphNodeJSON, including value, weight, and visited properties.
 * @returns {GraphNodeSemanticDTO} - The graph node as IGraphNodeSemantic, with relevant properties copied over.
 */
export function graphNodeJSONToSemantic(node: GraphNodeDTO): GraphNodeSemanticDTO {
    const nodeSemantic: GraphNodeSemanticDTO = {
      value: node.value,
    };
  
    if (node.weight !== null) {
      nodeSemantic.weight = node.weight;
    }
    if (node.visited !== null) {
      nodeSemantic.visited = node.visited;
    }
  
    return nodeSemantic;
}

/**
 * Converts a graph edge from IGraphEdgeJSON type to IGraphEdgeSemantic type.
 *
 * This function takes a single graph edge represented in IGraphEdgeJSON type and converts it to IGraphEdgeSemantic type.
 * It finds the corresponding node values based on their IDs in the provided nodes list and sets these values
 * for the semantic representation of the edge. Additional properties like weight are also copied over, if they exist.
 *
 * @param {GraphEdgeDTO} edge - The graph edge as IGraphEdgeJSON, containing node IDs and optionally a weight.
 * @param {GraphNodeDTO[]} nodesList - The list of nodes as IGraphNodeJSON, used to lookup node values by their IDs.
 * @returns {GraphEdgeSemanticDTO} - The graph edge as IGraphEdgeSemantic, with node values and weight copied over.
 */
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
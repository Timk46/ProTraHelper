import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { IGraphNode } from '../models/GraphNode.interface';
import { IGraphEdge } from '../models/GraphEdge.interface';
import { IGraphNewEdge } from '../models/GraphNewEdge.interface';
import {
  GraphConfigurationDTO,
  GraphNodeDTO,
  GraphEdgeDTO,
  GraphStructureSemanticDTO,
} from '@DTOs/graphTask.dto';
import { calculateShapeCenter, downloadJSON, graphToSemantic } from '../utils';

@Injectable({
  providedIn: 'root',
})
export class GraphTaskService {
  private readonly graphConfiguration$!: BehaviorSubject<GraphConfigurationDTO>;
  private readonly nodes$!: BehaviorSubject<IGraphNode[]>;
  private readonly edges$!: BehaviorSubject<IGraphEdge[]>;
  private readonly newEdge$!: BehaviorSubject<IGraphNewEdge>;
  private idCounter!: number;

  constructor() {
    // ##############
    // Initialize
    this.graphConfiguration$ = new BehaviorSubject<GraphConfigurationDTO>({
      nodeWeight: true,
      nodeSelected: true,
      nodeSelectedText: { selected: '', unselected: '' },
      edgeWeight: true,
      edgeDirected: true,
    });
    this.nodes$ = new BehaviorSubject<IGraphNode[]>([]);
    this.edges$ = new BehaviorSubject<IGraphEdge[]>([]);
    this.newEdge$ = new BehaviorSubject<IGraphNewEdge>({
      started: false,
      node1: null,
      node2: null,
      weight: 0,
    });
    this.idCounter = 0;
  }

  // ###########
  // Getters
  getGraphConfiguration(): Observable<GraphConfigurationDTO> {
    return this.graphConfiguration$;
  }

  getNodes(): Observable<IGraphNode[]> {
    return this.nodes$;
  }

  getEdges(): Observable<IGraphEdge[]> {
    return this.edges$;
  }

  getNewEdge(): Observable<IGraphNewEdge> {
    return this.newEdge$;
  }

  // ###########
  // Update
  configureGraph(graphConfiguration: GraphConfigurationDTO) {
    this.graphConfiguration$.next(graphConfiguration);
  }

  setNodes(nodes: IGraphNode[]) {
    this.nodes$.next(nodes);
  }

  setEdges(edges: IGraphEdge[]) {
    this.edges$.next(edges);
  }

  resetGraph() {
    this.nodes$.next([]);
    this.edges$.next([]);
    this.resetNewEdge();
    this.idCounter = 0;
  }

  addNode(newNodeAttributes: Partial<IGraphNode>): IGraphNode {
    // Destructure the attributes and assign default values if they are undefined
    let {
      nodeId = null,
      value = '',
      selected = null,
      weight = null,
      position = { x: 0, y: 0 },
      size = { width: 100, height: 100 }, // TODO:
    } = newNodeAttributes;

    // Adjust the properties according to the graphConfiguration
    if (this.graphConfiguration$.getValue().nodeWeight) {
      weight = { enabled: true, value: weight?.value || 0 };
    } else {
      weight = { enabled: false, value: null };
    }

    if (this.graphConfiguration$.getValue().nodeSelected) {
      selected = { enabled: true, value: selected?.value || false };
    } else {
      selected = { enabled: false, value: null };
    }

    // Check if nodeId is provided
    // graphFromJson: nodeId as parameter
    // via UI: nodeId = idCounter
    if (nodeId === null) {
      nodeId = this.idCounter;

      // Increment id counter for the next nodes
      this.idCounter += 1;
    } else {
      this.idCounter = nodeId + 1;
    }

    // TODO: Check if the value is unique

    // Generate new node
    const newNode: IGraphNode = {
      nodeId: nodeId,
      value: value,
      selected: selected,
      weight: weight,
      position: position,
      size: size,
      center: calculateShapeCenter(position, size),
    };

    // TODO: Can different nodes have same value?

    // Add node to the list of nodes
    this.nodes$.next([...this.nodes$.getValue(), newNode]);

    // Return newNode, because it is required to addEdge
    // TODO: Can this be done in a different way?
    return newNode;
  }

  addEdge(node1: IGraphNode, node2: IGraphNode, weightValue: number | null = null): void {
    // For directed graphs:
    // Check if an edge already exist which originates from the same node and points to the same node as the new edge
    // For undirected graphs:
    // Check if an edge already exist which aconnects these two nodes
    // TODO: Is this allowed, or must it be prevented?
    this.edges$.getValue().forEach(existingEdge => {
      if (
        this.graphConfiguration$.getValue().edgeDirected &&
        existingEdge.node1 === node1 &&
        existingEdge.node2 === node2
      ) {
        throw new Error(
          'These two nodes already are connected with an edge in the same direction.',
        );
      }
      if (
        !this.graphConfiguration$.getValue().edgeDirected &&
        ((existingEdge.node1 === node1 && existingEdge.node2 === node2) ||
          (existingEdge.node2 === node1 && existingEdge.node1 === node2))
      ) {
        throw new Error('These two nodes already are connected with an edge.');
      }
    });

    // Adjust the properties according to the graphConfiguration
    // TODO: use pre-defined type instead defining the type here
    let weight: { enabled: boolean; value: number | null };
    if (this.graphConfiguration$.getValue().edgeWeight) {
      weight = { enabled: true, value: weightValue || 0 };
    } else {
      weight = { enabled: false, value: null };
    }

    // Generate new edge
    const newEdge: IGraphEdge = {
      node1,
      node2,
      weight,
      directed: this.graphConfiguration$.getValue().edgeDirected,
    };

    // Add edge to the list of edges
    this.edges$.next([...this.edges$.getValue(), newEdge]);
  }

  removeNode(node: IGraphNode): void {
    // get the nodes and edges as list
    const nodesList = this.nodes$.getValue();
    const edgesList = this.edges$.getValue();

    // Check if the node is in the list of nodes, and
    // Find the index of the node if it is in the list
    const indexOfNode = nodesList.indexOf(node);
    if (indexOfNode === -1) {
      throw new Error('Node not found.');
    }

    // Remove edges containing the node
    const updatedEdges = edgesList.filter(edge => edge.node1 !== node && edge.node2 !== node);
    this.edges$.next(updatedEdges);

    // Remove the node
    nodesList.splice(indexOfNode, 1);
    this.nodes$.next(nodesList);
  }

  removeEdge(edge: IGraphEdge): void {
    // get the edges as list
    const edgesList = this.edges$.getValue();

    // Check if the edge is in the list of edges, and
    // Find the index of the edge if it is in the list
    const indexOfEdge = edgesList.indexOf(edge);
    if (indexOfEdge === -1) {
      throw new Error('Edge not found');
    }

    // Remove the edge
    edgesList.splice(indexOfEdge, 1);
    this.edges$.next(edgesList);
  }

  updateNode(node: IGraphNode, newValues: Partial<IGraphNode>) {
    const {
      value = null,
      selected = null,
      weight, // TODO: just adjusted to be undefined if no value is assigned to be able to assign null value but this not consistent
      position = null,
    } = newValues;

    if (value !== null) {
      // TODO: Check if the value is unique
      node.value = value;
    }

    // TODO: update also the attributes selected and weight

    if (position !== null) {
      node.position = position;
    }

    // TODO: just adjusted to be undefined if no value is assigned to be able to assign null value but this not consistent
    if (weight !== undefined) {
      node.weight.value = weight.value;
    }

    if (selected !== null) {
      node.selected.value = selected.value;
    }

    // TODO: if i replace the object in the list with a new object, how will this effect the edges etc. ???
    // for subscribers // TODO: is this required?
    this.nodes$.next(this.nodes$.getValue());
  }

  changeEdgeDirection(edge: IGraphEdge) {
    // get the edges as list
    const edgesList = this.edges$.getValue();

    // Check if the edges are directed according to graphConfiguration
    if (!this.graphConfiguration$.getValue().edgeDirected) {
      throw new Error('The edge is not directed.');
    }

    // Check if there is already an edge which starts at edge.node2 and ends at edge.node1
    const hasOppositeEdge = edgesList.some(
      existingEdge => existingEdge.node1 === edge.node2 && existingEdge.node2 === edge.node1,
    );

    if (hasOppositeEdge) {
      throw new Error(
        'There is already an edge which connects these nodes in the opposite direction.',
      );
    }

    // Get the nodes from the edge
    const newNode2 = edge.node1;
    const newNode1 = edge.node2;

    // Swap the nodes
    edge.node2 = newNode2;
    edge.node1 = newNode1;

    // Find the index of the edge to update it in the edges list
    const edgeIndex = edgesList.indexOf(edge);

    // If the edge is found, update the list
    if (edgeIndex !== -1) {
      const updatedEdgesList = [...edgesList];
      updatedEdgesList[edgeIndex] = edge;
      this.edges$.next(updatedEdgesList);
    } else {
      throw new Error('Edge not found.');
    }
  }

  updateEdgeWeight(edge: IGraphEdge, newWeight: number | null) {
    // Get the current list of edges
    const edgesList = this.edges$.getValue();

    // Find the index of the edge that needs updating
    const edgeIndex = edgesList.findIndex(existingEdge => existingEdge === edge);

    if (edgeIndex === -1) {
      throw new Error('Edge not found');
    }

    // Create a new edge object with the updated weight
    const updatedEdge = {
      ...edge,
      weight: { ...edge.weight, value: newWeight },
    };

    // Replace the old edge with the updated edge
    const updatedEdgesList = [...edgesList];
    updatedEdgesList[edgeIndex] = updatedEdge;

    // Update the BehaviorSubject with the new list of edges
    this.edges$.next(updatedEdgesList);
  }

  updateNewEdge(newValues: Partial<IGraphNewEdge>) {
    // Check input
    const { started = null, node1 = null, node2 = null, weight = null } = newValues;

    // Get new edge as object
    const newEdge = this.newEdge$.getValue();

    // Update the object
    if (started !== null) {
      newEdge.started = started;
    }
    if (node1 !== null) {
      newEdge.node1 = node1;
    }
    if (node2 !== null) {
      newEdge.node2 = node2;
    }
    if (weight !== null) {
      newEdge.weight = weight;
    }

    // Update the Subject
    this.newEdge$.next(newEdge);
  }

  resetNewEdge() {
    this.newEdge$.next({
      started: false,
      node1: null,
      node2: null,
      weight: 0,
    });
  }
  // #############
  // Utility functions
  adjustNodeAttributes(node: IGraphNode): GraphNodeDTO {
    // Destructure node object
    const {
      selected: { value: selectedValue, ...selectedRest },
      weight: { value: weightValue, ...weightRest },
      ...nodeRest
    } = node;
    return {
      ...nodeRest,
      selected: selectedValue,
      weight: weightValue,
    };
  }

  adjustEdgeAttributes(edge: IGraphEdge): GraphEdgeDTO {
    // Destructure edge object
    const {
      weight: { value: weightValue, ...weightRest },
      node1,
      node2,
      ...edgeRest
    } = edge;

    return {
      node1Id: node1.nodeId,
      node2Id: node2.nodeId,
      weight: weightValue,
    };
  }

  graphToJSON() {
    // get the nodes and edges as list
    const nodesList = this.nodes$.getValue();
    const edgesList = this.edges$.getValue();

    // Modify nodes to disclude some attributes
    const modifiedNodes = nodesList.map(node => {
      return this.adjustNodeAttributes(node);
    });

    // Modify edges to disclude some attributes
    const modifiedEdges = edgesList.map(edge => {
      return this.adjustEdgeAttributes(edge);
    });

    const graph = {
      structureType: 'graph',
      configuration: this.graphConfiguration$.getValue(),
      nodes: modifiedNodes,
      edges: modifiedEdges,
    };
    return graph;
    //const json = JSON.stringify(graph, null, 2);

    //return json;
  }

  graphToSemantic(): GraphStructureSemanticDTO {
    // get the nodes and edges as list
    const nodesList = this.nodes$.getValue();
    const edgesList = this.edges$.getValue();

    const graphSemantic: GraphStructureSemanticDTO = graphToSemantic({
      nodes: nodesList,
      edges: edgesList,
    });

    return graphSemantic;
  }

  downloadGraphAsJSON() {
    const graphAsJSON = this.graphToJSON();
    downloadJSON(graphAsJSON, 'graph');
  }

  graphDataFromJSON(initialNodeData: GraphNodeDTO[], initialEdgeData: GraphEdgeDTO[]) {
    // reset the graph state
    //this.resetGraph();

    // Add nodes
    initialNodeData.forEach((nodeJSON: any) => {
      // TODO: this is not proper to do but to fix the issue with weight temporarily
      if (typeof nodeJSON.weight === 'number') {
        nodeJSON.weight = {
          enabled: this.graphConfiguration$.getValue().nodeWeight,
          value: nodeJSON.weight,
        };
      }
      // TODO: this is not proper to do but to fix the issue with selected temporarily
      if (typeof nodeJSON.selected === 'boolean') {
        nodeJSON.selected = {
          enabled: this.graphConfiguration$.getValue().nodeSelected,
          value: nodeJSON.selected,
        };
      }

      // TODO: node config etc. must be from graphConfig
      this.addNode(nodeJSON);

      // Adjust idCounter
      this.idCounter = Math.max(this.idCounter, nodeJSON.nodeId);
    });

    // get the nodes as list
    const nodesList = this.nodes$.getValue();

    // Add edges
    initialEdgeData.forEach((edgeJSON: any) => {
      // find nodes
      let node1: IGraphNode | null = null;
      let node2: IGraphNode | null = null;
      nodesList.forEach(node => {
        if (node.nodeId === edgeJSON.node1Id) {
          node1 = node;
        }
        if (node.nodeId === edgeJSON.node2Id) {
          node2 = node;
        }
      });

      if (node1 !== null && node2 !== null) {
        this.addEdge(node1, node2, edgeJSON.weight);
      }
    });
  }

  graphFromJSON(json: string) {
    let graphJSON;
    try {
      graphJSON = JSON.parse(json);
    } catch (error) {
      console.error('Error parsing JSON data:', error);
    }

    // reset the graph state
    this.resetGraph();

    // Configure graph
    this.configureGraph(graphJSON.configuration);

    // Add nodes
    graphJSON.nodes.forEach((nodeJSON: any) => {
      // TODO: this is not proper to do but to fix the issue with weight temporarily
      if (typeof nodeJSON.weight === 'number') {
        nodeJSON.weight = {
          enabled: this.graphConfiguration$.getValue().nodeWeight,
          value: nodeJSON.weight,
        };
      }
      // TODO: this is not proper to do but to fix the issue with selected temporarily
      if (typeof nodeJSON.selected === 'boolean') {
        nodeJSON.selected = {
          enabled: this.graphConfiguration$.getValue().nodeSelected,
          value: nodeJSON.selected,
        };
      }

      // TODO: node config etc. must be from graphConfig
      this.addNode(nodeJSON);

      // Adjust idCounter
      this.idCounter = Math.max(this.idCounter, nodeJSON.nodeId);
    });

    // get the nodes as list
    const nodesList = this.nodes$.getValue();

    // Add edges
    graphJSON.edges.forEach((edgeJSON: any) => {
      // find nodes
      let node1: IGraphNode | null = null;
      let node2: IGraphNode | null = null;
      nodesList.forEach(node => {
        if (node.nodeId === edgeJSON.node1Id) {
          node1 = node;
        }
        if (node.nodeId === edgeJSON.node2Id) {
          node2 = node;
        }
      });

      if (node1 !== null && node2 !== null) {
        this.addEdge(node1, node2, edgeJSON.weight);
      }
    });
  }
}

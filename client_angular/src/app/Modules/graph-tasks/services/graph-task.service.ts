import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IGraphNode } from '../models/GraphNode.interface';
import { IGraphEdge } from '../models/GraphEdge.interface';
import { IGraphNewEdge } from '../models/GraphNewEdge.interface';
import { IGraphConfiguration } from '../models/GraphConfiguration.interface';
import { IGraphNodeJSON } from '../models/GraphNodeJSON.interface';
import { IGraphEdgeJSON } from '../models/GraphEdgeJSON.interface';
import { IGraphDataSemantic } from '../models/GraphDataSemantic.interface';
import { calculateShapeCenter, downloadJSON, graphToSemantic } from '../utils';

@Injectable({
  providedIn: 'root'
})

export class GraphTaskService {

  private graphConfiguration$!: BehaviorSubject<IGraphConfiguration>;
  private nodes$!: BehaviorSubject<IGraphNode[]>;
  private edges$!: BehaviorSubject<IGraphEdge[]>;
  private newEdge$!: BehaviorSubject<IGraphNewEdge>;
  private idCounter!: number;

  constructor() {

    // ##############
    // Initialize
    this.graphConfiguration$ = new BehaviorSubject<IGraphConfiguration>({
      nodeWeight: true, nodeVisited: true, edgeWeight: true, edgeDirected: true
    });
    this.nodes$ = new BehaviorSubject<IGraphNode[]>([]);
    this.edges$ = new BehaviorSubject<IGraphEdge[]>([]);
    this.newEdge$ = new BehaviorSubject<IGraphNewEdge>({
      started: false, node1: null, node2: null, weight: 0
    });
    this.idCounter = 0;
  }

  // ###########
  // Getters
  getGraphConfiguration(): Observable<IGraphConfiguration> {
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
  configureGraph(graphConfiguration: IGraphConfiguration) {
    this.graphConfiguration$.next(graphConfiguration);
  }

  setNodes(nodes: IGraphNode[]) {
    this.nodes$.next(nodes);
  }

  setEdges(edges: IGraphEdge[]) {
    this.edges$.next(edges);
  }

  resetGraph(){
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
      visited = null, 
      weight = null,
      position = { x: 0, y: 0},
      size = { width: 100, height: 100 },  // TODO:
    } = newNodeAttributes;

    // Adjust the properties according to the graphConfiguration
    if (this.graphConfiguration$.getValue().nodeWeight) {
      weight = { enabled: true, value: weight?.value || 0 };
    } else {
      weight = { enabled: false, value: null };
    }
    
    if (this.graphConfiguration$.getValue().nodeVisited) {
      visited = { enabled: true, value: visited?.value || false };
    } else {
      visited = { enabled: false, value: null };
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
      visited: visited,
      weight: weight,
      position: position,
      size: size,
      center: calculateShapeCenter(position, size)
    };

    // TODO: Can different nodes have same value?

    // Add node to the list of nodes
    this.nodes$.next([
      ...this.nodes$.getValue(),
      newNode
    ]);

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
      if (this.graphConfiguration$.getValue().edgeDirected && existingEdge.node1 === node1 && existingEdge.node2 === node2) {
        throw new Error('These two nodes already are connected with an edge in the same direction.')
      }
      if (!this.graphConfiguration$.getValue().edgeDirected && 
          (
          (existingEdge.node1 === node1 && existingEdge.node2 === node2) || 
          (existingEdge.node2 === node1 && existingEdge.node1 === node2) 
          )
        ){
        throw new Error('These two nodes already are connected with an edge.')
      }
    });

    // Adjust the properties according to the graphConfiguration  
    // TODO: use pre-defined type instead defining the type here 
    let weight: { enabled: boolean, value: number | null };
    if (this.graphConfiguration$.getValue().edgeWeight) {
      weight = { enabled: true, value: weightValue || 0 };
    } else {
      weight = { enabled: false, value: null };
    }

    // Generate new edge
    const newEdge: IGraphEdge = {
      node1, node2, weight, directed: this.graphConfiguration$.getValue().edgeDirected
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

    let { 
      value = null,
      visited = null, 
      weight, // TODO: just adjusted to be undefined if no value is assigned to be able to assign null value but this not consistent
      position = null,
    } = newValues;

    if (value !== null) {
      // TODO: Check if the value is unique
      node.value = value;
    }


    // TODO: update also the attributes visited and weight

    if (position !== null) {
      node.position = position;
    }

    // TODO: just adjusted to be undefined if no value is assigned to be able to assign null value but this not consistent
    if (weight !== undefined) {
      node.weight.value = weight.value;
    }

    if (visited !== null) {
      node.visited.value = visited.value;
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
    };

    // Check if there is already an edge which starts at edge.node2 and ends at edge.node1
    const hasOppositeEdge = edgesList.some(existingEdge => 
      existingEdge.node1 === edge.node2 && existingEdge.node2 === edge.node1
    );
    
    if (hasOppositeEdge) {
      throw new Error('There is already an edge which connects these nodes in the opposite direction.');
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
      weight: { ...edge.weight, value: newWeight }
    };
  
    // Replace the old edge with the updated edge
    const updatedEdgesList = [...edgesList];
    updatedEdgesList[edgeIndex] = updatedEdge;
  
    // Update the BehaviorSubject with the new list of edges
    this.edges$.next(updatedEdgesList);
  }
  

  updateNewEdge( newValues: Partial<IGraphNewEdge> ) {
    // Check input
    const { started = null, node1 = null, node2 = null, weight = null } = newValues;
    
    // Get new edge as object
    const newEdge = this.newEdge$.getValue();

    // Update the object
    if (started !== null) { newEdge.started = started; }
    if (node1 !== null) { newEdge.node1 = node1; }
    if (node2 !== null) { newEdge.node2 = node2; }
    if (weight !== null) { newEdge.weight = weight; }
  
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
  adjustNodeAttributes(node: IGraphNode): IGraphNodeJSON {
    // Destructure node object
    const { 
      visited: { value: visitedValue, ...visitedRest },
      weight: { value: weightValue, ...weightRest },
      ...nodeRest } = node;
    return {
      ...nodeRest,
      visited: visitedValue,
      weight: weightValue
    };
  }

  adjustEdgeAttributes(edge: IGraphEdge): IGraphEdgeJSON {
    // Destructure edge object
    const { 
      weight: { value: weightValue, ...weightRest },
      node1, node2,
      ...edgeRest } = edge;

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
      edges: modifiedEdges
    };
    return graph;
    //const json = JSON.stringify(graph, null, 2);
    
    //return json;
  }

  graphToSemantic(): IGraphDataSemantic {
    // get the nodes and edges as list
    const nodesList = this.nodes$.getValue();
    const edgesList = this.edges$.getValue();

    const graphSemantic: IGraphDataSemantic = graphToSemantic({ 
      nodes: nodesList, edges: edgesList
    });

    return graphSemantic;
  }

  downloadGraphAsJSON() {
    const graphAsJSON = this.graphToJSON();
    downloadJSON(graphAsJSON, 'graph');
  }

  graphDataFromJSON(initialNodeData: IGraphNodeJSON[], initialEdgeData: IGraphEdgeJSON[]) {
    
    // reset the graph state
    //this.resetGraph();

    // Add nodes
    initialNodeData.forEach((nodeJSON: any) => {

      // TODO: this is not proper to do but to fix the issue with weight temporarily
      if (typeof nodeJSON.weight === 'number') {
        nodeJSON.weight = {
          enabled: this.graphConfiguration$.getValue().nodeWeight,
          value: nodeJSON.weight
        }
      } 
      // TODO: this is not proper to do but to fix the issue with visited temporarily
      if (typeof nodeJSON.visited === 'boolean') {
        nodeJSON.visited = {
          enabled: this.graphConfiguration$.getValue().nodeVisited,
          value: nodeJSON.visited
        }
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
        if (node.nodeId === edgeJSON.node1Id) { node1 = node; }
        if (node.nodeId === edgeJSON.node2Id) { node2 = node; }
      });

      if (node1 !==  null && node2 !== null) {
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
          value: nodeJSON.weight
        }
      } 
      // TODO: this is not proper to do but to fix the issue with visited temporarily
      if (typeof nodeJSON.visited === 'boolean') {
        nodeJSON.visited = {
          enabled: this.graphConfiguration$.getValue().nodeVisited,
          value: nodeJSON.visited
        }
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
        if (node.nodeId === edgeJSON.node1Id) { node1 = node; }
        if (node.nodeId === edgeJSON.node2Id) { node2 = node; }
      });

      if (node1 !==  null && node2 !== null) {
        this.addEdge(node1, node2, edgeJSON.weight);
      }
    });
  }

}

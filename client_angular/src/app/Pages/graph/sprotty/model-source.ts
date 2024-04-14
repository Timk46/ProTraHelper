import { injectable } from 'inversify';
import { ActionHandlerRegistry, Expandable, LocalModelSource, TYPES } from 'sprotty';
import { ConceptGraphDTO, ConceptNodeDTO } from '@DTOs/index';
import { SprottyConceptEdge, SprottyConceptNode } from './sprottyModels.interface'
//import { SModelIndex } from 'sprotty-protocol/lib/utils/model-utils';
import {
  Action, CollapseExpandAction, CollapseExpandAllAction, SCompartment, SEdge, SGraph, SLabel,
  SModelIndex, SNode, SelectAction, CenterAction, FitToScreenAction, SShapeElement
} from 'sprotty-protocol';
import { GraphCommunicationService } from 'src/app/Services/graph/graphCommunication.service';
import { GraphDataService } from 'src/app/Services/graph/graph-data.service';
import { inject as injectAngular } from '@angular/core';
import { AwardLevelAction, CreateConceptAction, CreateEdgeAction, DeleteConceptAction, MoveNodeAction } from './actions';
import { MatDialog } from '@angular/material/dialog';
import { CreateConceptDialogComponent } from '../graph-dialogs/create-concept-dialog/create-concept-dialog.component';
import { has } from 'markdown-it/lib/common/utils';
import { first } from 'rxjs';



@injectable()
export class ConceptGraphModelSource extends LocalModelSource {

  private GraphCommunicationService: GraphCommunicationService = GraphCommunicationService.getInstance();
  private flatGraph: ConceptGraphDTO = { id: 0, name: "", nodeMap: {}, edgeMap: {}, trueRootId: 0 }
  graphData: GraphDataService | undefined;
  private dialog: MatDialog | undefined;
  currentModule = 1;

  // private variables for editing the graph
  // undefined if no change is in progress
  private EdgeCreator: { concept: string, type: string } | undefined;
  private NodeMover: { concept: string} | undefined;


  constructor() {
    super();
    this.dialog = injectAngular(MatDialog);
    this.graphData = injectAngular(GraphDataService)
    //this.initTestGraph();
    this.getUserGraph();
  }

  override initialize(registry: ActionHandlerRegistry): void {
    super.initialize(registry);
    // register all actions handled by this model source
    registry.register(SelectAction.KIND, this)
    registry.register(CollapseExpandAction.KIND, this)
    registry.register(CreateConceptAction.KIND, this)
    registry.register(DeleteConceptAction.KIND, this)
    registry.register(AwardLevelAction.KIND, this)
    registry.register(CreateEdgeAction.KIND, this)
    registry.register(MoveNodeAction.KIND, this)
  }

  override handle(action: Action) {
    //console.log("action: ", action)
    switch (action.kind) {
      case SelectAction.KIND:
        this.handleSelectAction(action as SelectAction);
        break;
      case CollapseExpandAction.KIND:
        this.handleCollapseExpandAction(action as CollapseExpandAction);
        break;

      case CreateConceptAction.KIND:
        this.handleCreateConceptAction(action as CreateConceptAction);
        break;

      case DeleteConceptAction.KIND:
        this.handleDeleteConceptAction(action as DeleteConceptAction);
        break;

      case AwardLevelAction.KIND:
        this.handleAwardLevelAction(action as AwardLevelAction);
        break;

      case CreateEdgeAction.KIND:
        this.handleCreateEdgeAction(action as CreateEdgeAction);
        break;

      case MoveNodeAction.KIND:
        this.handleMoveNodeAction(action as MoveNodeAction);
        break;

      default: super.handle(action);
    }
  }

  /**
   * Fetches the user graph from the server and initializes the graph
   */
  private getUserGraph() {
    this.graphData!.fetchUserGraph(this.currentModule).subscribe((graph) => {
      this.initGraph(graph);
    });
  }

  /**
   * Initializes the graph with the given flatGraph by creating the
   * root node and adding the first layer of nodes and edges
   * the recursive function addChildren is called for each node to add its children
   * @param flatGraph the graph to be initialized
   */
  public initGraph(flatGraph: ConceptGraphDTO) {
    this.flatGraph = flatGraph;

    const graph: SGraph = {
      type: 'graph',
      id: 'root',
      children: [],
      layoutOptions: {
        //hGap: 5,
        hAlign: 'left',
        // paddingLeft: 7,
        // paddingRight: 7,
        // paddingTop: 7,
        // paddingBottom: 7
      }
    };

    // add first layer of nodes
    this.flatGraph.nodeMap[this.flatGraph.trueRootId].childIds.forEach(childId => {
      const flatChild: ConceptNodeDTO = this.flatGraph.nodeMap[childId];
      if (flatChild) {
        const expanded = flatChild.expanded !== undefined ? flatChild.expanded : true;
        const level = flatChild.level ? flatChild.level : 0;
        const hasChildren = flatChild.childIds.length > 0;
        const newChild = this.createConceptNode("root", "node_" + flatChild.databaseId, flatChild.name, expanded, level,
          flatChild.goal ? flatChild.goal : 0, flatChild.databaseId, hasChildren);
        graph.children!.push(newChild);
        if (expanded) {
          this.addChildren(newChild, 'concept');
        }
        else {
          this.addChildren(newChild, 'mini-concept');
        }
      }
    });

    // add first layer of edges
    this.flatGraph.nodeMap[this.flatGraph.trueRootId].edgeChildIds.forEach(edgeChildId => {
      const flatChild = this.flatGraph.edgeMap[edgeChildId];
      if (flatChild) {
        const edgeChild = this.createEdge("edge_" + flatChild.databaseId, "node_" + flatChild.sourceId, "node_" + flatChild.targetId, "root", flatChild.databaseId);
        graph.children!.push(edgeChild);
      }
    });

    this.currentRoot = graph;
    this.updateModel();
  }


  /**
   * This recursive function adds children to a node in the graph. It also calculates the level and goal summaries for parent nodes.
   * @param parentNode
   * @param type of the children being added, is 'concept' for parent and leaf nodes, 'mini-concept' for mini concepts and 'not-visible' for dummy nodes
   * @returns levels and goals of leaf nodes
   */
  private addChildren(parentNode: SprottyConceptNode, type: string): { descendants: number, descendantLevels: number[], descendantLevelGoals: number[] } {
    const flatParentNode = this.flatGraph.nodeMap[parentNode.databaseId];
    // variables for counting descendants
    let descendantData = { descendants: 0, descendantLevels: [0, 0, 0, 0, 0, 0], descendantLevelGoals: [0, 0, 0, 0, 0, 0] };
    let childDescData = { descendants: 0, descendantLevels: [0, 0, 0, 0, 0, 0], descendantLevelGoals: [0, 0, 0, 0, 0, 0] };

    // add children
    if (flatParentNode.childIds.length > 0) {
      flatParentNode.childIds.forEach(childId => {
        const flatChild = this.flatGraph.nodeMap[childId];
        if (flatChild) {
          const expanded = flatChild.expanded !== undefined ? flatChild.expanded : true;
          const level = flatChild.level ? flatChild.level : 0;
          let newChild;
          if (type === 'mini-concept') {
            newChild = this.createMiniConceptNode(parentNode.id, "node_" + flatChild.databaseId, flatChild.name, level, flatChild.goal ? flatChild.goal : 0, flatChild.databaseId);
            parentNode.children!.push(newChild);
          }
          else if (type === 'concept') {
            const hasChildren = flatChild.childIds.length > 0;
            newChild = this.createConceptNode(parentNode.id, "node_" + flatChild.databaseId, flatChild.name, expanded, level, flatChild.goal ? flatChild.goal : 0, flatChild.databaseId, hasChildren);
            parentNode.children!.push(newChild);
          }
          else { // type === 'not-visible'
            // dummy node, is not added to the graph. we need to keep the recursion going for counting descendants
            newChild = this.createMiniConceptNode(parentNode.id, "node_" + flatChild.databaseId, flatChild.name, level, flatChild.goal ? flatChild.goal : 0, flatChild.databaseId);
          }


          if (expanded && type === 'concept') {
            childDescData = this.addChildren(newChild, 'concept');
          }
          else if (type === 'concept') {
            childDescData = this.addChildren(newChild, 'mini-concept');
          }
          else if (parentNode.numberDescendants === undefined && type === 'mini-concept' || type === 'not-visible') {
            // keep the recursion going for counting descendants, but don't add children to the graph
            childDescData = this.addChildren(newChild, 'not-visible');
          }

          // update descendant data
          descendantData.descendants += childDescData.descendants;
          for (let i = 0; i < 6; i++) {
            descendantData.descendantLevels[i] += childDescData.descendantLevels[i];
            descendantData.descendantLevelGoals[i] += childDescData.descendantLevelGoals[i];
          }
        }
      });
      // update descendant data of parentNode if it is not set yet
      if (parentNode.numberDescendants === undefined) {
        parentNode.numberDescendants = descendantData.descendants;
        parentNode.descendantLevels = descendantData.descendantLevels;
        parentNode.descendantLevelGoals = descendantData.descendantLevelGoals;
        // parentNode.children!.push(
        //   <SLabel>{
        //     id: 'desc_' + parentNode.id,
        //     type: 'label:text',
        //     text: 'descendants: ' + parentNode.numberDescendants + ' desLevels' + parentNode.descendantLevels + ' desGoals' + parentNode.descendantLevelGoals,
        //     position: { x: 5, y: 30 },
        //   });
      }

    }
    else {
      // no children, end of recursion
      descendantData.descendants += 1;
      const maxLevels = flatParentNode.goal ? flatParentNode.goal : 6; // never count mor than goal levels for progress bar
      for (let i = 0; i < maxLevels; i++) {
        if (flatParentNode.level != undefined && flatParentNode.level > i) {
          descendantData.descendantLevels[i] += 1;
        }
        if (flatParentNode.goal != undefined && flatParentNode.goal > i) {
          descendantData.descendantLevelGoals[i] += 1;
        }
      }
    }




    // add edge children
    if (flatParentNode.edgeChildIds.length > 0) {
      flatParentNode.edgeChildIds.forEach(edgeChildId => {
        const flatChild = this.flatGraph.edgeMap[edgeChildId];
        if (flatChild) {
          const edgeChild = this.createEdge("edge_" + flatChild.databaseId, "node_" + flatChild.sourceId, "node_" + flatChild.targetId, parentNode.id, flatChild.databaseId);
          parentNode.children!.push(edgeChild);
        }
      });
    }
    // add own level and goal to descendant data

    return descendantData;
  }

  /**
   * Is called every time a node is selected. Updates the active node in the graphCommunication service,
   * updates the selected concept in the database and handles edge creating and node moving if the respective
   * private variables are set
   * @param action
   */
  handleSelectAction(action: SelectAction): void {
    // send data to contentOverview
    const index = new SModelIndex();
    index.add(this.currentRoot);
    let firstSelectedNode = index.getById((action as SelectAction).selectedElementsIDs[0]) as SprottyConceptNode;
    if (firstSelectedNode !== undefined && firstSelectedNode?.type.startsWith('node')) {
      const currentActiveNode = this.flatGraph.nodeMap[(firstSelectedNode as SprottyConceptNode).databaseId];
      this.GraphCommunicationService.changeActiveNode(currentActiveNode); // TODO: communicate more data like all selected concepts and maybe leaf nodes

      // update selected concept in database
      this.graphData!.updateSelectedConcept(currentActiveNode.databaseId).subscribe((res) => {
      });
    }

    // create edge if EdgeCreator is set
    // very hacky, no sanity checks anywhere
    if (this.EdgeCreator !== undefined) {
      this.CreateEdge(index, firstSelectedNode);
    }

    // move node if NodeMover is set
    if (this.NodeMover !== undefined) {
      this.MoveNode(index, firstSelectedNode);
    }
  }

  /**
   * Opens the dialog for creating a new concept
   * @param action
   */
  handleCreateConceptAction(action: CreateConceptAction): void {
    const index = new SModelIndex();
    index.add(this.currentRoot);
    const sprottyParentNode = index.getById(action.parentId) as SprottyConceptNode;
    let parentDatabaseId;

    if (sprottyParentNode == undefined) {
      parentDatabaseId = this.flatGraph.trueRootId;
    }
    else {
      parentDatabaseId = sprottyParentNode.databaseId;
    }

    const dialogRef = this.dialog?.open(CreateConceptDialogComponent, {
      data: { parentId: parentDatabaseId },
    });
    dialogRef?.afterClosed().subscribe((result) => {
      if (result === 'success') {
        this.getUserGraph();
      }
    });

  }

  /**
   * Deletes the current concept
   * @param action
   */
  handleDeleteConceptAction(action: DeleteConceptAction): void {
    const index = new SModelIndex();
    index.add(this.currentRoot);

    // if action.conceptId starts with "node", delete concept
    if (action.conceptId.startsWith("node")) {

      const sprottyNode = index.getById(action.conceptId) as SprottyConceptNode;


      if (sprottyNode !== undefined) {
        //todo: check if node is deletable and if it has multiple parents?
        this.graphData!.deleteConcept(sprottyNode.databaseId).subscribe((res) => {
          //console.log("deleted concept: ", res);
          this.getUserGraph();
        });
      }
    }
    else if(action.conceptId.startsWith("edge")){
      const sprottyEdge = index.getById(action.conceptId) as SprottyConceptEdge;
      if (sprottyEdge !== undefined) {
        this.graphData!.deleteEdge(sprottyEdge.databaseId).subscribe((res) => {
          //console.log("deleted edge: ", res);
          this.getUserGraph();
        });
      }
    }
  }

  /**
   * Expands and collapses nodes in the graph
   * @param action
   */
  async handleCollapseExpandAction(action: CollapseExpandAction): Promise<void> {
    const index = new SModelIndex();
    index.add(this.currentRoot);

    // expand nodes
    for (const id of action.expandIds) {
      const element = index.getById(id);
      if (element !== undefined && element!.type.startsWith('node')) {
        const node = element as SprottyConceptNode;
        node.expanded = true;
        element.children = element.children?.filter(child => !child.type.startsWith('node'));
        element.children = element.children?.filter(child => !child.type.startsWith('edge'));
        this.addChildren(node, 'concept');
        this.deleteEdgeBends(this.currentRoot);
        await this.updateModel();
        this.updateExpandedState(node, true);
        this.actionDispatcher.dispatch(CenterAction.create([id], { animate: true, retainZoom: true }))
        this.actionDispatcher.dispatch(FitToScreenAction.create([id], { animate: true, maxZoom: 1 }))
      }
    }

    // collapse nodes
    for (const id of action.collapseIds) {
      const element = index.getById(id);
      if (element !== undefined && element.type.startsWith('node')) {
        const node = element as SprottyConceptNode;
        node.expanded = false;
        // remove children
        element.children = element.children?.filter(child => !child.type.startsWith('node'));
        element.children = element.children?.filter(child => !child.type.startsWith('edge'));
        this.addChildren(node, 'mini-concept');

        this.deleteEdgeBends(this.currentRoot);
        await this.updateModel();
        this.updateExpandedState(node, false);
      }
    }
  }

  private updateExpandedState(node: SprottyConceptNode, expanded: boolean) {
    this.flatGraph.nodeMap[node.databaseId].expanded = expanded;
    this.graphData!.updateConceptExpansionState(node.databaseId, expanded).subscribe();
  }

  /**
   * called through the context menu, increases level of the node by one
   * @param action
   */
  handleAwardLevelAction(action: AwardLevelAction): void {
    const index = new SModelIndex();
    index.add(this.currentRoot);
    const sprottyNode = index.getById(action.conceptId) as SprottyConceptNode;
    const currentLevel = sprottyNode.level ? sprottyNode.level : 0;
    const newLevel = currentLevel + 1;
    this.graphData!.updateUserLevel(sprottyNode.databaseId, newLevel ).subscribe(
      (res) => {
        //console.log("updated concept: ", res);
        this.getUserGraph();
      }
    );

  }

  /**
   * called through the context menu, sets the EdgeCreator variable to the selected node
   * @param action
   */
  handleCreateEdgeAction(action: CreateEdgeAction): void {
    // set private variable that will be checked when a new node is selected
    const index = new SModelIndex();
    index.add(this.currentRoot);

    this.EdgeCreator = { concept: action.conceptId, type: action.connectionType };
    this.NodeMover = undefined;
  }

  /**
   * Sends a request to the server to create an edge between the currently selected node and the node that
   * was selected when the CreateEdgeAction was dispatched
   * @param index index of the current graph
   * @param firstSelectedNode the first of the currently selected nodes
   * @returns
   */
  private CreateEdge(index: SModelIndex, firstSelectedNode: SprottyConceptNode) {
    const sprottyNode = index.getById(this.EdgeCreator!.concept) as SprottyConceptNode;
      const parentNodeId = sprottyNode.parentIds![0];
      if (parentNodeId !== firstSelectedNode?.parentIds![0]) {
        // nodes have different parents, do nothing
        this.EdgeCreator = undefined;
        return;
      }

      // get databaseId of parentNode
      let parentNodeDatabaseId = 0;
      if (parentNodeId === "root") {
        parentNodeDatabaseId = this.flatGraph.trueRootId;
      }
      else {
        parentNodeDatabaseId = (index.getById(parentNodeId)! as SprottyConceptNode).databaseId;
      }

      if (this.EdgeCreator!.type === 'prerequisite') {
        // newly selected node is prerequisite of sprottyNode
        this.graphData!.createEdge(parentNodeDatabaseId, firstSelectedNode.databaseId, sprottyNode.databaseId).subscribe((res) => {
          //console.log("created edge: ", res);
          this.getUserGraph();
          this.updateModel();
        });
      }
      else if (this.EdgeCreator!.type === 'successor') {
        // newly selected node is successor of sprottyNode
        this.graphData!.createEdge(parentNodeDatabaseId, sprottyNode.databaseId, firstSelectedNode.databaseId).subscribe((res) => {
          //console.log("created edge: ", res);
          this.getUserGraph();
          this.updateModel();
        });
      }

      this.EdgeCreator = undefined;
  }

  /**
   * called through the context menu, sets the NodeMover variable to the selected node
   * @param action
   */
  handleMoveNodeAction(action: MoveNodeAction): void {
    const index = new SModelIndex();
    index.add(this.currentRoot);
    this.NodeMover = { concept: action.conceptId };
    this.EdgeCreator = undefined;
  }

  /**
   * moves the node that was selected when the MoveNodeAction was dispatched to the currently selected node
   * @param index
   * @param firstSelectedNode
   */
  private MoveNode(index: SModelIndex, firstSelectedNode: SprottyConceptNode) {
    const sprottyNode = index.getById(this.NodeMover!.concept) as SprottyConceptNode;
    const newParentNodeId = firstSelectedNode.databaseId;


    this.graphData!.moveConceptNode(sprottyNode.databaseId, newParentNodeId).subscribe((res) => {
      //console.log("moved node: ", res);
      this.getUserGraph();
      this.updateModel();
    });

    this.NodeMover = undefined;
  }


  /**
   * creates new sprotty concept node
   * @param parentId the sprotty id of the parent
   * @param id sprotty id of the node being created, is 'node_' + databaseId
   * @param name title of the node
   * @param expanded true or false, if the node is expanded or not
   * @param level integer from 0 to 6, the level of the node for the current user
   * @param levelGoal integer from 0 to 6, the goal level of the node for the current module
   * @param databaseId id of this node in the database
   * @returns a ConceptNode
   */
  createConceptNode(parentId: string, id: string, name: string, expanded: boolean, level: number, levelGoal: number, databaseId: number,
    hasChildren: boolean): SprottyConceptNode {
    // determine render type
    let nodeType = 'node:concept';
    if (!hasChildren) {
      nodeType = 'node:leaf-concept';
    }
    const node: SNode & SprottyConceptNode & Expandable = {
      type: nodeType,
      id: id,
      databaseId: databaseId,
      name: name,
      expanded: expanded,
      level: level,
      levelGoal: levelGoal,
      parentIds: [parentId],
      children: [],
      layout: 'vbox'
    };
    node.children = [];

    //expand/collapse button
    if (hasChildren) {
      node.children.push(<SShapeElement>{
        id: 'button_' + id,
        type: 'button:expand',
        position: { x: 5, y: 10 },
      })
    }

    //header
    node.children.push(
      <SLabel>{
        id: 'header_' + id,
        type: 'label:heading',
        text: name,
      });

    return node;
  }


  /**
   * creates new mini concept node
   * @param parentId the sprotty id of the parent
   * @param id sprotty graph id , usually 'node_' + databaseId
   * @param name title of the node
   * @param level integer from 0 to 6, the level of the node for the current user
   * @param levelGoal integer from 0 to 6, the goal level of the node for the current module
   * @param databaseId id of this node in the database
   * @returns a ConceptNode
   */
  createMiniConceptNode(parentId: string, id: string, name: string, level: number, levelGoal: number, databaseId: number): SprottyConceptNode {
    const node: SNode & SprottyConceptNode & Expandable = {
      type: "node:mini-concept",
      id: id,
      databaseId: databaseId,
      name: name,
      expanded: false,
      level: level,
      levelGoal: levelGoal,
      parentIds: [parentId],
      children: [],
      //layout: 'hbox'
    };

    return node;
  }

  /**
   * Creates a sprotty edge for the graph
   * @param id string, 'edge_' + databaseId
   * @param sourceId string, 'node_' + databaseId
   * @param targetId string, 'node_' + databaseId
   * @param parentId string, 'node_' + databaseId (except if it is the root, then it is 'root')
   * @param databaseId id of this edge in the database
   * @returns SpottyConceptEdge
   */
  createEdge(id: string, sourceId: string, targetId: string, parentId: string, databaseId: number): SEdge {
    const edge: SprottyConceptEdge = {
      type: 'edge',
      id: id,
      sourceId: sourceId,
      targetId: targetId,
      databaseId: databaseId,
      parentId: parentId
    };
    return edge;
  }

  /**
   * Deletes all edge bends. This is a temporary solution to a bug in elk.
   * When the issue is fixed (and integrated into sprotty), this function should be removed
   * to reduce unnecessary lag.
   * Link to issue in elk: https://github.com/eclipse/elk/issues/1001
   * Link to (closed) issue in sprotty: https://github.com/eclipse-sprotty/sprotty/issues/427
   * The function recursively goes through the graph and deletes all edge bends.
   */
  deleteEdgeBends(node: SGraph | SNode) {

    for (const child of node.children!) {
      if(child.type === 'edge'){
        const edge = child as SEdge;
        edge.routingPoints = [];
      }
      else if (child.type.startsWith('node')) {
        this.deleteEdgeBends(child)
      }
    }
  }

}

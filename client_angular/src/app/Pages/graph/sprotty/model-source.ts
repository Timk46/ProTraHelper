import { injectable } from 'inversify';
import { ActionHandlerRegistry, Expandable, LocalModelSource,TYPES } from 'sprotty';
import { ConceptGraphDTO, ConceptNodeDTO } from '@DTOs/index';
import { SprottyConceptNode } from './sprottyModels.interface'
//import { SModelIndex } from 'sprotty-protocol/lib/utils/model-utils';
import {
  Action, CollapseExpandAction, CollapseExpandAllAction, SCompartment, SEdge, SGraph, SLabel,
  SModelIndex, SNode, SelectAction, CenterAction, SShapeElement
} from 'sprotty-protocol';
import { GraphCommunicationService } from 'src/app/Services/graph/graphCommunication.service';
import { GraphDataService } from 'src/app/Services/graph/graph-data.service';
import { inject as injectAngular } from '@angular/core';
import { CreateConceptAction, DeleteConceptAction } from './actions';
import { MatDialog } from '@angular/material/dialog';
import { CreateConceptDialogComponent } from '../graph-dialogs/create-concept-dialog/create-concept-dialog.component';



@injectable()
export class ConceptGraphModelSource extends LocalModelSource {

  private GraphCommunicationService: GraphCommunicationService = GraphCommunicationService.getInstance();
  private flatGraph: ConceptGraphDTO = { id: 0, name: "", nodeMap: {}, edgeMap: {}, trueRootId: 0 }
  graphData: GraphDataService | undefined;
  private dialog: MatDialog | undefined;
  currentModule = 1;


  constructor() {
    super();
    this.dialog = injectAngular(MatDialog);
    this.graphData = injectAngular(GraphDataService)
    //this.initTestGraph();
    this.getUserGraph();
  }

  override initialize(registry: ActionHandlerRegistry): void {
    super.initialize(registry);
    registry.register(SelectAction.KIND, this)
    registry.register(CollapseExpandAction.KIND, this)
    registry.register(CreateConceptAction.KIND, this)
    registry.register(DeleteConceptAction.KIND, this)
  }

  override handle(action: Action) {
    console.log("action: ", action)
    switch (action.kind) {
      case SelectAction.KIND:
        console.log("this is the select action: ", action);
        const index = new SModelIndex();
        index.add(this.currentRoot);
        let firstSelectedNode = index.getById((action as SelectAction).selectedElementsIDs[0]);
        if (firstSelectedNode !== undefined && firstSelectedNode?.type.startsWith('node')) {
          const currentActiveNode = this.flatGraph.nodeMap[(firstSelectedNode as SprottyConceptNode).databaseId];
          this.GraphCommunicationService.changeActiveNode(currentActiveNode); // TODO: type - communicate node info to contentOverview (so get full node info from db first?)
        }
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

      default: super.handle(action);
    }
  }

  private getUserGraph() {
    this.graphData!.fetchUserGraph(this.currentModule).subscribe((graph) => {
      this.initGraph(graph);
    });
  }

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
        const newChild = this.createConceptNode("node_" + flatChild.databaseId, flatChild.name, expanded, level, flatChild.databaseId, hasChildren);
        graph.children!.push(newChild);
        if (expanded) {
          this.addChildren(newChild, 'concept');
        }
        else
          this.addChildren(newChild, 'mini-concept');
      }
    });

    // add first layer of edges
    this.flatGraph.nodeMap[this.flatGraph.trueRootId].edgeChildIds.forEach(edgeChildId => {
      const flatChild = this.flatGraph.edgeMap[edgeChildId];
      if (flatChild) {
        const edgeChild = this.createEdge("edge_" + flatChild.databaseId, "node_" + flatChild.sourceId, "node_" + flatChild.targetId);
        graph.children!.push(edgeChild);
      }
    });

    this.currentRoot = graph;
    this.updateModel();
  }

  private addChildren(parentNode: SprottyConceptNode, type: string) {
    const flatParentNode = this.flatGraph.nodeMap[parentNode.databaseId];
    // add children
    if (flatParentNode.childIds.length > 0) {
      flatParentNode.childIds.forEach(childId => {
        const flatChild = this.flatGraph.nodeMap[childId];
        if (flatChild) {
          const expanded = flatChild.expanded !== undefined ? flatChild.expanded : true;
          const level = flatChild.level ? flatChild.level : 0;
          let newChild;
          if (type === 'mini-concept') {
            newChild = this.createMiniConceptNode("node_" + flatChild.databaseId, flatChild.name, level, flatChild.databaseId);
          }
          else {
            const hasChildren = flatChild.childIds.length > 0;
            newChild = this.createConceptNode("node_" + flatChild.databaseId, flatChild.name, expanded, level, flatChild.databaseId, hasChildren);
          }
          parentNode.children!.push(newChild);

          if (expanded && type === 'concept') {
            this.addChildren(newChild, 'concept');
          }
          else if (type === 'concept')
            this.addChildren(newChild, 'mini-concept');
        }
      });
    }

    // add edge children
    if (flatParentNode.edgeChildIds.length > 0) {
      flatParentNode.edgeChildIds.forEach(edgeChildId => {
        const flatChild = this.flatGraph.edgeMap[edgeChildId];
        if (flatChild) {
          const edgeChild = this.createEdge("edge_" + flatChild.databaseId, "node_" + flatChild.sourceId, "node_" + flatChild.targetId);
          parentNode.children!.push(edgeChild);
        }
      });
    }
  }

  handleCreateConceptAction(action: CreateConceptAction): void {
    const index = new SModelIndex();
    index.add(this.currentRoot);
    const sprottyParentNode = index.getById(action.parentId) as SprottyConceptNode;
    let parentDatabaseId;
    console.log("sprottyParentNode: ", index)

    if (sprottyParentNode == undefined) {
      parentDatabaseId = this.flatGraph.trueRootId;
    }
    else {
      parentDatabaseId = sprottyParentNode.databaseId;
    }

      console.log("handleCreateConceptAction: ", action, sprottyParentNode);
      const dialogRef = this.dialog?.open(CreateConceptDialogComponent, {
        data: { parentId: parentDatabaseId},
      });
      dialogRef?.afterClosed().subscribe((result) => {
        if (result === 'success') {
          this.getUserGraph();
        }
      });
    
  }

  /**
   * Deletes the current concept if it has no children
   * @param action 
   */
  handleDeleteConceptAction(action: DeleteConceptAction): void {
    console.log("handleDeleteConceptAction: ", action);
    const index = new SModelIndex();
    index.add(this.currentRoot);
    const sprottyNode = index.getById(action.conceptId) as SprottyConceptNode;


    if (sprottyNode !== undefined) {
      const flatNode: ConceptNodeDTO = this.flatGraph.nodeMap[sprottyNode.databaseId];
      //todo: check if node is deletable and if it has multiple parents?
      this.graphData!.deleteConcept(sprottyNode.databaseId).subscribe((res) => {
        console.log("deleted concept: ", res);
        this.getUserGraph();
      });
    }
  }

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
        await this.updateModel();
        this.updateExpandedState(node, true);
        this.actionDispatcher.dispatch(CenterAction.create([id], { animate: true }))
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

        this.updateModel();
        this.updateExpandedState(node, false);
      }
    }
  }

  private updateExpandedState(node: SprottyConceptNode, expanded: boolean) {
    this.flatGraph.nodeMap[node.databaseId].expanded = expanded;
    this.graphData!.updateUserConceptData(node.databaseId, { expanded: expanded }).subscribe();
  }

  // initTestGraph() {
  //   console.log("initTestGraph() called");
  //   const graph: SGraph = {
  //     type: 'graph',
  //     id: 'root',
  //     children: [],
  //     layoutOptions: {
  //       hGap: 5,
  //       hAlign: 'left',
  //       paddingLeft: 7,
  //       paddingRight: 7,
  //       paddingTop: 7,
  //       paddingBottom: 7
  //     }
  //   };

  //   // Programmiergrundlagen
  //   const node1: SprottyConceptNode = this.createConceptNode('1', 'Programmiergrundlagen', true, 2, 1);

  //   const node2 = this.createConceptNode('2', 'Variablen', true, 4, 1);
  //   node1.children!.push(node2);

  //   const node3 = this.createConceptNode('3', 'Datentypen', true, 3, 1);
  //   const node4 = this.createConceptNode('4', 'boolean', true, 3, 1);
  //   const node5 = this.createConceptNode('5', 'strings', true, 3, 1);
  //   const node6 = this.createConceptNode('6', 'numbers', true, 3, 1);
  //   node3.children!.push(node4, node5, node6);
  //   node1.children!.push(node3);
  //   const edge_2_3 = this.createEdge('edge_2_3', '2', '3');
  //   node1.children!.push(edge_2_3);

  //   const node7 = this.createConceptNode('7', 'Kontrollelemente', true, 2, 1);
  //   const node8 = this.createConceptNode('8', 'if/else', true, 2, 1);
  //   const node9 = this.createConceptNode('9', 'and/or', true, 2, 1);
  //   node7.children!.push(node8, node9);
  //   node1.children!.push(node7);
  //   const edge_3_7 = this.createEdge('edge_3_7', '3', '7');
  //   node1.children!.push(edge_3_7);

  //   const node10 = this.createConceptNode('10', 'while', true, 1, 1);
  //   node1.children!.push(node10);
  //   const edge_7_10 = this.createEdge('edge_7_10', '7', '10');
  //   node1.children!.push(edge_7_10);

  //   const node11 = this.createConceptNode('11', 'for', true, 0, 1);
  //   node1.children!.push(node11);
  //   const edge_7_11 = this.createEdge('edge_7_11', '7', '11');
  //   node1.children!.push(edge_7_11);

  //   graph.children!.push(node1);

  //   this.currentRoot = graph;
  // }

  // creates new concept node (locally)
  /**
   * 
   * @param id sprotty graph id , usually 'node_' + databaseId
   * @param name title of the node
   * @param expanded true or false, if the node is expanded or not
   * @param level integer from 0 to 6, the level of the node for the current user
   * @param databaseId id of this node in the database
   * @returns a ConceptNode
   */
  createConceptNode(id: string, name: string, expanded: boolean, level: number, databaseId: number, hasChildren: boolean): SprottyConceptNode {
    const node: SNode & SprottyConceptNode & Expandable = {
      type: "node:concept",
      id: id,
      databaseId: databaseId,
      name: name,
      expanded: expanded,
      level: level,
      levelGoal: 3,
      children: [],
      //layout: 'hbox'
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

    //level
    // node.children.push(
    //   <SLabel>{
    //     id: 'level_' + id,
    //     type: 'label:text',
    //     text: 'Level: ' + level.toString(),
    //   },
    // );

    return node;
  }

  // creates new mini concept node (locally)
  /**
   * 
   * @param id sprotty graph id , usually 'node_' + databaseId
   * @param name title of the node
   * @param expanded true or false, if the node is expanded or not
   * @param level integer from 0 to 6, the level of the node for the current user
   * @param databaseId id of this node in the database
   * @returns a ConceptNode
   */
  createMiniConceptNode(id: string, name: string, level: number, databaseId: number): SprottyConceptNode {
    const node: SNode & SprottyConceptNode & Expandable = {
      type: "node:mini-concept",
      id: id,
      databaseId: databaseId,
      name: name,
      expanded: false,
      level: level,
      levelGoal: 3,
      children: [],
      //layout: 'hbox'
    };

    return node;
  }


  createEdge(id: string, sourceId: string, targetId: string): SEdge {
    const edge: SEdge = {
      type: 'edge',
      id: id,
      sourceId: sourceId,
      targetId: targetId
    };
    return edge;
  }


}

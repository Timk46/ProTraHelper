import { injectable } from 'inversify';
import { ActionHandlerRegistry, Expandable, LocalModelSource, TYPES, VBoxLayouter } from 'sprotty';
import { ConceptGraphDTO } from '@DTOs/index';
import { SprottyConceptNode } from './sprottyModels.interface'
//import { SModelIndex } from 'sprotty-protocol/lib/utils/model-utils';
import {
  Action, CollapseExpandAction, CollapseExpandAllAction, SCompartment, SEdge, SGraph, SLabel,
  SModelElement, SModelIndex, SModelRoot, SNode, SelectAction, CenterAction, Point, SPort
} from 'sprotty-protocol';
import { GraphCommunicationService } from 'src/app/Services/graphCommunication.service';
import { GraphDataService } from 'src/app/Services/graph-data.service';
import { ThisReceiver } from '@angular/compiler';
import { inject as injectAngular } from '@angular/core';
import { NoDataRowOutlet } from '@angular/cdk/table';


@injectable()
export class ConceptGraphModelSource extends LocalModelSource {

  private GraphCommunicationService: GraphCommunicationService = GraphCommunicationService.getInstance();
  private flatGraph: ConceptGraphDTO = { id: 0, name: "", nodeMap: {}, edgeMap: {}, trueRootId: 0 }
  graphData: GraphDataService | undefined;
  userId = 2;


  constructor() {
    super();
    this.graphData = injectAngular(GraphDataService)
    //this.initTestGraph();
    this.graphData.fetchUserGraph(this.userId).subscribe((graph) => {
      this.initGraph(graph);
    });
  }

  override initialize(registry: ActionHandlerRegistry): void {
    super.initialize(registry);
    registry.register(SelectAction.KIND, this)
    registry.register(CollapseExpandAction.KIND, this)
  }

  override handle(action: Action) {
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

      default: super.handle(action);
    }
  }

  public initGraph(flatGraph: ConceptGraphDTO) {
    this.flatGraph = flatGraph;

    const graph: SGraph = {
      type: 'graph',
      id: 'root',
      children: [],
      layoutOptions: {
        hGap: 5,
        hAlign: 'left',
        paddingLeft: 7,
        paddingRight: 7,
        paddingTop: 7,
        paddingBottom: 7
      }
    };

    // add first layer of nodes
    this.flatGraph.nodeMap[this.flatGraph.trueRootId].childIds.forEach(childId => {
      const flatChild = this.flatGraph.nodeMap[childId];
      if (flatChild) {
        const expanded = flatChild.expanded !== undefined ? flatChild.expanded : true;
        const level = flatChild.level ? flatChild.level : 0;
        const newChild = this.createConceptNode("node_" + flatChild.databaseId, flatChild.name, expanded, level, flatChild.databaseId);
        graph.children!.push(newChild);
        if (expanded) {
          this.addChildren(newChild);
        }
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

  private addChildren(parentNode: SprottyConceptNode) {
    const flatParentNode = this.flatGraph.nodeMap[parentNode.databaseId];
    // add children
    if (flatParentNode.childIds.length > 0) {
      flatParentNode.childIds.forEach(childId => {
        const flatChild = this.flatGraph.nodeMap[childId];
        if (flatChild) {
          const expanded = flatChild.expanded !== undefined ? flatChild.expanded : true;
          const level = flatChild.level ? flatChild.level : 0;
          const newChild = this.createConceptNode("node_" + flatChild.databaseId, flatChild.name, expanded, level, flatChild.databaseId);
          parentNode.children!.push(newChild);

          if (expanded) {
            this.addChildren(newChild);
          }
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

  handleCollapseExpandAction(action: CollapseExpandAction): void {
    const index = new SModelIndex();
    index.add(this.currentRoot);

    // expand nodes
    for (const id of action.expandIds) {
      const element = index.getById(id);
      if (element !== undefined && element!.type.startsWith('node')) {
        const node = element as SprottyConceptNode;
        node.expanded = true;
        this.addChildren(node);
        this.updateModel();
        this.updateExpandedState(node, true);
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

        this.updateModel();
        this.updateExpandedState(node, false);
      }
    }
  }

  private updateExpandedState(node: SprottyConceptNode, expanded: boolean) {
    this.flatGraph.nodeMap[node.databaseId].expanded = expanded;
    this.graphData!.updateUserConceptData(this.userId, node.databaseId, { expanded: expanded }).subscribe();
  }

  initTestGraph() {
    console.log("initTestGraph() called");
    const graph: SGraph = {
      type: 'graph',
      id: 'root',
      children: [],
      layoutOptions: {
        hGap: 5,
        hAlign: 'left',
        paddingLeft: 7,
        paddingRight: 7,
        paddingTop: 7,
        paddingBottom: 7
      }
    };

    // Programmiergrundlagen
    const node1: SprottyConceptNode = this.createConceptNode('1', 'Programmiergrundlagen', true, 2, 1);

    const node2 = this.createConceptNode('2', 'Variablen', true, 4, 1);
    node1.children!.push(node2);

    const node3 = this.createConceptNode('3', 'Datentypen', true, 3, 1);
    const node4 = this.createConceptNode('4', 'boolean', true, 3, 1);
    const node5 = this.createConceptNode('5', 'strings', true, 3, 1);
    const node6 = this.createConceptNode('6', 'numbers', true, 3, 1);
    node3.children!.push(node4, node5, node6);
    node1.children!.push(node3);
    const edge_2_3 = this.createEdge('edge_2_3', '2', '3');
    node1.children!.push(edge_2_3);

    const node7 = this.createConceptNode('7', 'Kontrollelemente', true, 2, 1);
    const node8 = this.createConceptNode('8', 'if/else', true, 2, 1);
    const node9 = this.createConceptNode('9', 'and/or', true, 2, 1);
    node7.children!.push(node8, node9);
    node1.children!.push(node7);
    const edge_3_7 = this.createEdge('edge_3_7', '3', '7');
    node1.children!.push(edge_3_7);

    const node10 = this.createConceptNode('10', 'while', true, 1, 1);
    node1.children!.push(node10);
    const edge_7_10 = this.createEdge('edge_7_10', '7', '10');
    node1.children!.push(edge_7_10);

    const node11 = this.createConceptNode('11', 'for', true, 0, 1);
    node1.children!.push(node11);
    const edge_7_11 = this.createEdge('edge_7_11', '7', '11');
    node1.children!.push(edge_7_11);

    graph.children!.push(node1);

    this.currentRoot = graph;
  }

  // creates new concept node (locally)
  createConceptNode(id: string, name: string, expanded: boolean, level: number, databaseId: number): SprottyConceptNode {
    const node: SNode & SprottyConceptNode & Expandable = {
      type: 'node:concept',
      id: id,
      databaseId: databaseId,
      name: name,
      expanded: expanded,
      level: level,
      levelGoal: 3,
      //layout: 'hbox'
    };
    node.children = [
      <SLabel>{
        id: 'header_' + id,
        type: 'label:heading',

        text: name,
      },
      <SLabel>{
        id: 'level_' + id,
        type: 'label:text',
        text: 'Level: ' + level.toString(),
      },
    ];
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

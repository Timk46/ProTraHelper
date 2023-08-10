import { injectable } from 'inversify';
import { ActionHandlerRegistry, Expandable, LocalModelSource, TYPES, VBoxLayouter } from 'sprotty';
import { ConceptNode } from '@Interfaces/index';
//import { SModelIndex } from 'sprotty-protocol/lib/utils/model-utils';
import {
    Action, CollapseExpandAction, CollapseExpandAllAction, SCompartment, SEdge, SGraph, SLabel,
    SModelElement, SModelIndex, SModelRoot, SNode, SelectAction, CenterAction, Point, SPort
} from 'sprotty-protocol';
import { ChangeActiveNodeService } from 'src/app/Services/changeActiveNode.service';


@injectable()
export class ConceptGraphModelSource extends LocalModelSource {

  private changeActiveNodeService: ChangeActiveNodeService = ChangeActiveNodeService.getInstance();

    constructor() {
        super();
        this.initTestGraph();
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
                this.changeActiveNodeService.changeActiveNode(action); // TODO: type - communicate node info to contentOverview (so get full node info from db first?)
                break;
            case CollapseExpandAction.KIND:
                //this.handleCollapseExpandAction(action as CollapseExpandAction);
                break;

            default: super.handle(action);
        }
    }

    initTestGraph() {
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
        const node1: ConceptNode = this.createConceptNode('1', 'Programmiergrundlagen', true, 2);

        const node2 = this.createConceptNode('2', 'Variablen', true, 4);
        node1.children!.push(node2);

        const node3 = this.createConceptNode('3', 'Datentypen', true, 3);
        const node4 = this.createConceptNode('4', 'boolean', true, 3);
        const node5 = this.createConceptNode('5', 'strings', true, 3);
        const node6 = this.createConceptNode('6', 'numbers', true, 3);
        node3.children!.push(node4, node5, node6);
        node1.children!.push(node3);
        const edge_2_3 = this.createEdge('edge_2_3', '2', '3');
        node1.children!.push(edge_2_3);

        const node7 = this.createConceptNode('7', 'Kontrollelemente', true, 2);
        const node8 = this.createConceptNode('8', 'if/else', true, 2);
        const node9 = this.createConceptNode('9', 'and/or', true, 2);
        node7.children!.push(node8, node9);
        node1.children!.push(node7);
        const edge_3_7 = this.createEdge('edge_3_7', '3', '7');
        node1.children!.push(edge_3_7);

        const node10 = this.createConceptNode('10', 'while', true, 1);
        node1.children!.push(node10);
        const edge_7_10 = this.createEdge('edge_7_10', '7', '10');
        node1.children!.push(edge_7_10);

        const node11 = this.createConceptNode('11', 'for', true, 0);
        node1.children!.push(node11);
        const edge_7_11 = this.createEdge('edge_7_11', '7', '11');
        node1.children!.push(edge_7_11);

        graph.children!.push(node1);

        this.currentRoot = graph;
    }

    // creates new concept node (locally)
    createConceptNode(id: string, name: string, expanded: boolean, level: number): ConceptNode {
        const node: SNode & ConceptNode & Expandable = {
          type: 'node:concept',
          id: id,
          name: name,
          expanded: expanded,
          level: level,
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

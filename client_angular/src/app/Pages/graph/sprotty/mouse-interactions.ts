import { IButtonHandler, MouseListener, SButton, findParentByFeature, isExpandable } from "sprotty";
import { Action, CollapseExpandAction, SModelElement, Point } from 'sprotty-protocol';
import { injectable, inject } from 'inversify';
import { expand } from "rxjs";
import { SprottyConceptNode } from "@Interfaces/index";
//import { NodeCreator } from "./di.config";

export const NodeCreator = Symbol('NodeCreator');

export class CustomMouseListener extends MouseListener {
    override doubleClick(target: SModelElement, event: MouseEvent): (Action | Promise<Action>)[] {
        
        console.log('double clicked ' + target.id, target)
        
        if(target.type === 'node:concept') {
            const conceptNode = target as SprottyConceptNode;
            const action = CollapseExpandAction.create({
                expandIds:   conceptNode.expanded ? [] : [ conceptNode.id ],
                collapseIds:  conceptNode.expanded ? [ conceptNode.id ] : []
            })
            //target.actionDispatcher.dispatch(action)
            return [action ];
        } else {
            return [];
        }
    }
}

// @injectable()
// export class DroppableMouseListener extends MouseListener {

//     @inject(NodeCreator) nodeCreator!: ((target: SModelElement, event: Event) => void);

//     override dragOver(target: SModelElement, event: MouseEvent): (Action | Promise<Action>)[] {
//         event.preventDefault();
//         return [];
//     }

//     override drop(target: SModelElement, event: MouseEvent): (Action | Promise<Action>)[] {
//         if(this.nodeCreator){
//             this.nodeCreator(target, event);
//         }
//         return [];
//     }
// }
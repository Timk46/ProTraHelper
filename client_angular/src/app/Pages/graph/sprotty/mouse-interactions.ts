import { ContextMenuMouseListener, ContextMenuProviderRegistry, IActionDispatcher, IButtonHandler, IContextMenuService, IContextMenuServiceProvider, 
    MouseListener, SModelElementImpl, TYPES, findParentByFeature, isExpandable, isSelectable, 
    isSelected } from "sprotty";
import { Action, CollapseExpandAction, SModelElement, Point, SelectAction } from 'sprotty-protocol';
import { injectable, inject } from 'inversify';
import { expand } from "rxjs";
import { SprottyConceptNode } from "./sprottyModels.interface";
import ElkConstructor from "elkjs";
import { PermissionService } from "./permissionService";
//import { NodeCreator } from "./di.config";

export const NodeCreator = Symbol('NodeCreator');

export class CustomMouseListener extends MouseListener {
    @inject(TYPES.IActionDispatcher) protected actionDispatcher!: IActionDispatcher;
    
    constructor(
        @inject(TYPES.IContextMenuServiceProvider) protected readonly contextMenuService: IContextMenuServiceProvider,
    @inject(TYPES.IContextMenuProviderRegistry) protected readonly menuProvider: ContextMenuProviderRegistry,
    //private permissionService: PermissionService
    ){
        super();
    }

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

    override contextMenu(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        // this function is called when the user right-clicks on an element
        // it selects the right-clicked element and deselects all other elements
        // the context menu is opened by the standard sprotty context menu service
        console.log('context menu ' + target.id, target)


        const root = target.root;
        const options = { selectedElementsIDs: [target.id], deselectedElementsIDs: Array.from(root.index.all().filter(isSelected), 
            (val) => { return val.id; }) };
        this.actionDispatcher.dispatch(SelectAction.create(options));
        return [];
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
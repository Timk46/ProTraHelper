import { ContextMenuMouseListener, IActionDispatcher, IButtonHandler, IContextMenuService, IContextMenuServiceProvider, 
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
    // @inject(TYPES.IActionDispatcher) protected actionDispatcher!: IActionDispatcher;
    
    // constructor(@inject(TYPES.IContextMenuServiceProvider) protected readonly contextMenuService: IContextMenuServiceProvider,
    // private permissionService: PermissionService){
    //     super();
    // }

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

    // override contextMenu(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
    //     console.log('context menu ' + target.id, target)
    //     super.contextMenu(target, event);
    //     //this.showContextMenu(target, event);
    //     return [];
    // }

    // protected async showContextMenu(target: SModelElementImpl, event: MouseEvent): Promise<void> {
    //     let menuService: IContextMenuService;
    //     try {
    //         menuService = await this.contextMenuService();
    //     } catch (rejected) {
    //         // IContextMenuService is not bound => do nothing
    //         return;
    //     }

    //     let isTargetSelected = false;
    //     const selectableTarget = findParentByFeature(target, isSelectable);
    //     if (selectableTarget) {
    //         isTargetSelected = selectableTarget.selected;
    //         selectableTarget.selected = true;
    //     }

    //     const root = target.root;
    //     const mousePosition = { x: event.x, y: event.y };
    //     if (target.id === root.id || isSelected(selectableTarget)) {
    //         const menuItems = await this.menuProvider.getItems(root, mousePosition);
    //         const restoreSelection = () => { if (selectableTarget) selectableTarget.selected = isTargetSelected; };
    //         menuService.show(menuItems, mousePosition, restoreSelection);
    //     } else {
    //         if (isSelectable(target)) {
    //             const options = { selectedElementsIDs: [target.id], deselectedElementsIDs: Array.from(root.index.all().filter(isSelected), (val) => { return val.id; }) };
    //             await this.actionDispatcher.dispatch(SelectAction.create(options));
    //         }
    //         const items = await this.menuProvider.getItems(root, mousePosition);
    //         menuService.show(items, mousePosition);
    //     }
    // }

    // protected getMenuItems(target: SprottyConceptNode, mousePosition: Point): LabeledAction[] {
    //     const items: LabeledAction[] = [];
    //     if (this.permissionService.canEdit(target)) {
    //         items.push(new LabeledAction('Add Child', [this.nodeCreator]));
    //     }
    //     return items;
    

    //}
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
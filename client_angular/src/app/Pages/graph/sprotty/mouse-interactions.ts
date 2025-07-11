import type {
  ContextMenuProviderRegistry,
  IActionDispatcher,
  IContextMenuServiceProvider,
  SModelElementImpl,
} from 'sprotty';
import {
  ContextMenuMouseListener,
  IButtonHandler,
  IContextMenuService,
  MouseListener,
  TYPES,
  findParentByFeature,
  isExpandable,
  isSelectable,
  isSelected,
} from 'sprotty';
import type { Action, SModelElement } from 'sprotty-protocol';
import { CollapseExpandAction, Point, SelectAction } from 'sprotty-protocol';
import { injectable, inject } from 'inversify';
import { expand } from 'rxjs';
import type { SprottyConceptNode } from './sprottyModels.interface';
import ElkConstructor from 'elkjs';
//import { NodeCreator } from "./di.config";

export const NodeCreator = Symbol('NodeCreator');

export class CustomMouseListener extends MouseListener {
  @inject(TYPES.IActionDispatcher) protected actionDispatcher!: IActionDispatcher;
  // the last touch position is stored to calculate the panning distance
  private lastTouchPosition: { x: number; y: number } | null = null;
  constructor(
    @inject(TYPES.IContextMenuServiceProvider)
    protected readonly contextMenuService: IContextMenuServiceProvider,
    @inject(TYPES.IContextMenuProviderRegistry)
    protected readonly menuProvider: ContextMenuProviderRegistry,
  ) {
    super();
  }

  // sends a collapse/expand action to the action dispatcher when a node is double-clicked
  override doubleClick(target: SModelElement, event: MouseEvent): (Action | Promise<Action>)[] {
    //console.log('double clicked ' + target.id, target)

    if (target.type === 'node:concept') {
      const conceptNode = target as SprottyConceptNode;
      const action = CollapseExpandAction.create({
        expandIds: conceptNode.expanded ? [] : [conceptNode.id],
        collapseIds: conceptNode.expanded ? [conceptNode.id] : [],
      });
      return [action];
    } else {
      return [];
    }
  }

  override contextMenu(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
    // this function is called when the user right-clicks on an element
    // it selects the right-clicked element and deselects all other elements
    // the context menu is opened by the standard sprotty context menu service
    //console.log('context menu ' + target.id, target)

    const root = target.root;
    const options = {
      selectedElementsIDs: [target.id],
      deselectedElementsIDs: Array.from(root.index.all().filter(isSelected), val => {
        return val.id;
      }),
    };
    this.actionDispatcher.dispatch(SelectAction.create(options));
    return [];
  }

  // Touch event handlers
  touchStart(event: TouchEvent): void {
    console.log('Touch start');
    event.preventDefault();
    const touch = event.touches[0];
    const targetElement = document.elementFromPoint(
      touch.clientX,
      touch.clientY,
    ) as unknown as SModelElement;
    if (!targetElement) return;
    // Call any specific actions or create a new action if needed
    console.log('Touch start on element', targetElement.id);
    // Dispatch an action if necessary
  }

  touchMove(event: TouchEvent): void {
    console.log('Touch move');
    event.preventDefault();
    if (this.lastTouchPosition && event.touches.length === 1) {
      const touch = event.touches[0];
      const dx = touch.clientX - this.lastTouchPosition.x;
      const dy = touch.clientY - this.lastTouchPosition.y;
      this.panGraph(dx, dy);
      this.lastTouchPosition = { x: touch.clientX, y: touch.clientY };
      console.log('Touch move', dx, dy);
    }
  }

  touchEnd(event: TouchEvent): void {
    event.preventDefault();
    console.log('Touch end');
    this.lastTouchPosition = null;
  }

  touchCancel(target: SModelElement, event: TouchEvent): (Action | Promise<Action>)[] {
    // Handle touch cancel event, if needed
    console.log('Touch cancel');
    this.lastTouchPosition = null;
    return [];
  }

  private panGraph(dx: number, dy: number): void {
    // Implement graph panning here, typically adjusting the viewBox or a similar property of your SVG/graph rendering
    console.log(`Graph panned by: dx=${dx}, dy=${dy}`);
  }
}

// can be used for drag-and-drop functionality, probably broken right now
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

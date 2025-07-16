import { Action } from 'sprotty-protocol';
import { SprottyConceptNode } from './sprottyModels.interface';

// these actions are handled in the model-source.
// to use, the actionDispatcher.dispatch() function is called with the action as an argument
// it needs to be injected into the class that calls it, for an example see the mouse-interactions.ts file
// @inject has to be imported from inversify for this to work, not from angular/core!

export interface TouchEventAction extends Action {
  kind: typeof TouchEventAction.KIND;
  touchEvent: TouchEvent;
}

export namespace TouchEventAction {
  export const KIND = 'touchEvent';

  export function create(touchEvent: TouchEvent): TouchEventAction {
    return {
      kind: KIND,
      touchEvent: touchEvent,
    };
  }
}
export interface CreateConceptAction extends Action {
  kind: typeof CreateConceptAction.KIND;
  parentId: string;
}
export namespace CreateConceptAction {
  export const KIND = 'createConcept';

  export function create(options: { parentId: string }): CreateConceptAction {
    return {
      kind: KIND,
      parentId: options.parentId,
    };
  }
}

export interface DeleteConceptAction extends Action {
  kind: typeof DeleteConceptAction.KIND;
  conceptId: string;
}
export namespace DeleteConceptAction {
  export const KIND = 'deleteConcept';

  export function create(options: { conceptId: string }): DeleteConceptAction {
    return {
      kind: KIND,
      conceptId: options.conceptId,
    };
  }
}

// increases concept level of user by 1
export interface AwardLevelAction extends Action {
  kind: typeof AwardLevelAction.KIND;
  conceptId: string;
}

export namespace AwardLevelAction {
  export const KIND = 'awardLevel';

  export function create(options: { conceptId: string }): AwardLevelAction {
    return {
      kind: KIND,
      conceptId: options.conceptId,
    };
  }
}

export interface CreateEdgeAction extends Action {
  kind: typeof CreateEdgeAction.KIND;
  conceptId: string;
  connectionType: string;
}

export namespace CreateEdgeAction {
  export const KIND = 'createEdge';

  export function create(options: { conceptId: string; connectionType: string }): CreateEdgeAction {
    return {
      kind: KIND,
      conceptId: options.conceptId,
      connectionType: options.connectionType,
    };
  }
}

export interface MoveNodeAction extends Action {
  kind: typeof MoveNodeAction.KIND;
  conceptId: string;
}

export namespace MoveNodeAction {
  export const KIND = 'moveNode';

  export function create(options: { conceptId: string }): MoveNodeAction {
    return {
      kind: KIND,
      conceptId: options.conceptId,
    };
  }
}

export interface CustomAction extends Action {
  kind: typeof CustomAction.KIND;
  nodeId: string;
}

export namespace CustomAction {
  export const KIND = 'custom';

  export function create(options: { nodeId: string }): CustomAction {
    return {
      kind: KIND,
      nodeId: options.nodeId,
    };
  }
}

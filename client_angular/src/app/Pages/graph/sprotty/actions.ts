import { Action } from "sprotty-protocol";
import { SprottyConceptNode } from "./sprottyModels.interface";

// these actions are handled in the model-source. 
// to use, the actionDispatcher.dispatch() function is called with the action as an argument
// it needs to be injected into the class that calls it, for an example see the mouse-interactions.ts file
// @inject has to be imported from inversify for this to work, not from angular/core!

export interface CreateConceptAction extends Action {
    kind: typeof CreateConceptAction.KIND;
    parentId: string;
}
export namespace CreateConceptAction {
    export const KIND = 'createConcept';

    export function create(options: { parentId: string }): CreateConceptAction {
        return {
            kind: KIND,
            parentId: options.parentId
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
            conceptId: options.conceptId
        };
    }
}

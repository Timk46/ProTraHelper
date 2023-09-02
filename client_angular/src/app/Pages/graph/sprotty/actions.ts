import { Action } from "sprotty-protocol";
import { SprottyConceptNode } from "./sprottyModels.interface";

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
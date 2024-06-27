// import { BaseEdge } from "@Interfaces/editorEdges.interface";
// import { BaseNode, nodeType } from "@Interfaces/editorNodes.interface";
import { ClassEdge } from "@Interfaces/index";
import { ClassNode } from "@Interfaces/index";

export enum EditorModel {
    CLASSDIAGRAM = "classdiagram",
    MEALY = "mealy",
    PETRI = "petri",
}

export enum EditorElement {
    // Classdiagram
    // ATTENTION: The string names must currently be unique!
    CD_CLASS = "Klasse",
    CD_INTERFACE = "Interface",
    CD_ABSTRACT_CLASS = "Abstrakte Klasse",

    CD_GENERALISATION = "Generalisierung",                         //      ________|>
    CD_IMPLEMENTATION = "Implementierung / Realisierung",          //      --------|>
    CD_CONTAINMENT = "Enthaltungsbeziehung",                       //      ________(x)
    CD_INFORMATION_FLOW = "Informationsfluss",                      //      -------->    <<flow>>
    CD_DEPENDENCY = "Abhängigkeit",                                //      -------->
    CD_ABSTRACTION = "Abstraktion",                                //      -------->    <<abstraction>>
    CD_SUBSTITUTION = "Substitution",                              //      -------->    <<substitute>>
    CD_USAGE = "Nutzung",                                          //      -------->    <<use>>
    CD_ASSOCIATION = "Assoziation",                                //      ________
    CD_DIRECTIONAL_ASSOCIATION = "Gerichtete Assoziation",          //      ________>
    CD_BIDIRECTIONAL_ASSOCIATION = "Bidirektionale Assoziation",    //     <________>
    CD_COMPOSITION = "Komposition",                                //      ________<<>>
    CD_AGGREGATION = "Aggregation",                                //      ________<  >

    // MEALY
    // ...
}

export const SwappableEditorElement: EditorElement[]= [
    EditorElement.CD_ASSOCIATION,
    EditorElement.CD_BIDIRECTIONAL_ASSOCIATION,
];


export enum EditorElementType {
    NODE = "node",
    EDGE = "edge",
}
export interface editorModelDTO {
    id: number;
    model: EditorModel; 
    title: string;
    description: string;
}

export interface editorElementDTO {
    id: number;
    element: EditorElement;
    elementType: EditorElementType;
    editorModelId: number;
    title: string;
    description: string;
    data: string;
}

export interface editorDataDTO {
    nodes: ClassNode[];
    edges: ClassEdge[];
}
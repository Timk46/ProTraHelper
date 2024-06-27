import { EditorElement } from "../dtos/index";

export interface ClassNode {
    identification: string;
    type: EditorElement;
    id: string;
    position: {x: number, y: number};
    width: number;
    height: number;
    title?: string;
    attributes?: ClassAttribute[];
    methods?: ClassMethod[];
    highlighted?: {
        code: string,
        maxPoints?: {
            attributes: number,
            methods: number
        },
        added?: ClassNodeHighlightContent,
        deleted?: ClassNodeHighlightContent,
        updated?: ClassNodeHighlightContent};
  }

export interface ClassNodeHighlightContent {
    title?: string;
    type?: EditorElement;
    attributes?: ClassAttribute[];
    methods?: ClassMethod[];
}
export interface ClassAttribute {
    name: string;
    dataType: dataType;
    visibility: visibilityType;
}

export interface ClassMethod {
    name: string;
    dataType: dataType;
    visibility: visibilityType;
}

export enum visibilityType {
    empty = "",
    private = "-",
    public = "+",
    protected = "#",
}

export enum dataType {
    empty = "",
    string = "string",
    number = "number",
    boolean = "boolean",
    void = "void",
    any = "any",
    undefined = "undefined",
    integer = "int",
    double = "double",
}

export interface NodeMatch {
    solutionNode: ClassNode;
    attemptNode: ClassNode;
    percentageMatch: number;
}
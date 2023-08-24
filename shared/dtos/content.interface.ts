import { contentElementType } from "./contentElementType.enum";
import { QuestionDTO } from "./question.interface";

export interface Content {
    contentNodeId: number;
    name: string;
    description: string;
    contentElements: ContentElement[];

    contentPrerequisiteIds?: number[];
    contentSuccessorIds?: number[];

    requiresConcepts: number[];
    trainsConcepts: number[];

    //discussion: Discussion // TODO: implement
}

export interface ContentElement {
    id: number;
    type: contentElementType;
    position: number;
    title?: string;
    text?: string;
    file?: File;
    question?: QuestionDTO;
}
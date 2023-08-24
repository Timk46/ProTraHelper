import { contentElementType } from "./contentElementType.enum";
import { QuestionDTO } from "./question.dto";

export interface ContentDTO {
    contentNodeId: number;
    name: string;
    description: string;
    contentElements: ContentElementDTO[];

    contentPrerequisiteIds?: number[];
    contentSuccessorIds?: number[];

    requiresConcepts: number[];
    trainsConcepts: number[];

    //discussion: Discussion // TODO: implement
}

export interface ContentElementDTO {
    id: number;
    type: contentElementType;
    position: number;
    title?: string;
    text?: string;
    file?: File;
    question?: QuestionDTO;
}
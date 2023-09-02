import { contentElementType } from "./contentElementType.enum";
import { QuestionDTO } from "./question.dto";
import { FileDto } from "./file.dto";

export interface ContentDTO {
    contentNodeId: number;
    name: string;
    description: string;
    contentElements: ContentElementDTO[];

    contentPrerequisiteIds?: number[];
    contentSuccessorIds?: number[];

    requiresConceptIds: number[];
    trainsConceptIds: number[];

    //discussion: Discussion // TODO: implement
}

export interface ContentElementDTO {
    id: number;
    type: contentElementType;
    position: number;
    title?: string;
    text?: string;
    file?: FileDto;
    question?: QuestionDTO;
}

export interface ContentsForConceptDTO {
    trainedBy: ContentDTO[];
    requiredBy: ContentDTO[];
}
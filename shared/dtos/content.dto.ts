import { contentElementType } from "./contentElementType.enum";
import { QuestionDTO } from "./question.dto";
import { FileDto } from "./file.dto";
import { userAnswerFeedbackDTO } from "./userAnswer.dto";

export interface ContentDTO {
    contentNodeId: number;
    name: string;
    description: string;
    contentElements: ContentElementDTO[];
    level: number;

    contentPrerequisiteIds?: number[];
    contentSuccessorIds?: number[];

    requiresConceptIds: number[];
    trainsConceptIds: number[];

    progress: number;
    levelProgress?: number;
    questionMarked?: boolean;

    //for lecturers view
    isApproved?: boolean;

    //discussion: Discussion // TODO: implement
}

export interface ContentViewDTO {
    contentNode: ContentDTO;
    contentElement: ContentElementDTO;
    position: number;
}

export interface ContentElementDTO {
    id: number;
    type: contentElementType;
    positionInSpecificContentView: number;
    title?: string;
    text?: string;
    file?: FileDto;
    question?: taskViewDTO;
}

export interface ContentsForConceptDTO {
    trainedBy: ContentDTO[];
    requiredBy: ContentDTO[];
}

export interface taskViewDTO {
    id: number;
    name?: string;
    description?: string;
    type: string;
    level: number;
    progress: number;
    feedback?: userAnswerFeedbackDTO[];

    //for lecturers view
    isApproved?: boolean;
}
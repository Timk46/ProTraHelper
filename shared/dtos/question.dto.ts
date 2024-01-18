import { FileDto } from "./file.dto";

export interface QuestionDTO {
    id: number;
    name?: string;
    description?: string;
    score?: number;
    type: string;
    author?: number;
    text: string;
    conceptNode?: number;
    isApproved: boolean;
    originId: number | null;
}

export interface QuestionVersionDTO {
    id: number;
    questionId: number;
    version: number;
    isApproved: boolean;
    successor: number | null;
}

//MC-Question
export interface McQuestionDTO {
    id: number;
    questionVersion?: QuestionVersionDTO ;
    isSC: boolean;
    shuffleOptions: boolean;
}

/**
 * This DTO is for showing the mc options in the mc task component
 */
export interface MCOptionDTO {
    id: number;
    text: string;
    files?: FileDto[];
    //isCorrect needs to be deleted from the MCOptionDTO that is given to the mc task component, because is shows the correct anwers!
    isCorrect: boolean;
    //selected is only used in the mc task component and so it should also be transfered to the MCOptionCheckDTO
    selected?: boolean;
}

/**
 * This DTO is for checking the mc answers of the user
 */
export interface MCOptionCheckDTO {
    id: number;
    text: string;
    files?: FileDto[];
    isCorrect: boolean;
    selected?: boolean;
}

export interface McQuestionOptionDTO {
    id: number;
    mcQuestion?: McQuestionDTO;
    mcOption: MCOptionDTO;
}

export interface UserMCAnswerDTO {
    id: number;
    userId: number;
    mcQuestionId: number;
}
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

export interface MCOptionDTO {
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

export interface OptionDTO {
    id : number;
    text: string;
    selected: boolean;
}

export interface UserMCAnswerDTO {
    id: number;
    userId: number;
    mcQuestionId: number;
}

export interface UserAnswerDTO {
    id: number;
    userId: number;
    questionId: number;
    feedbackId: number | null;
    userFreetextAnswer: string | null;
}

export interface UserAnswerDataDTO {
    id: number;
    userId: number;
    questionId: number;
    userFreetextAnswer?: string;
    userMCAnswer?: number[];
    //space for more types of answers
}

export interface UserMCOptionSelectedDTO {
    id: number,
    userAnswerId: number,
    mcOptionId: number
}
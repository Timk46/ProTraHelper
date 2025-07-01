import { GraphStructureDTO } from "./graphTask.dto";
import { CodeGameEvaluationDTO } from "./codeGame.dto";
import { FileUploadDTO } from "./file.dto";

export interface UserAnswerDataDTO {
    id: number;
    contentElementId?: number;
    userId: number;
    questionId: number;
    userFreetextAnswer?: string;
    userFreetextAnswerRaw?: string;
    userMCAnswer?: number[];
    userFillinTextAnswer?: UserFillinAnswer[];
    userGraphAnswer?: GraphStructureDTO[];
    codeGameEvaluation?: CodeGameEvaluationDTO;
    userUploadAnswer?: UserUploadAnswer;
    //space for more types of answers
}

export interface UserMCOptionSelectedDTO {
    id: number,
    userAnswerId: number,
    mcOptionId: number
}

export interface userAnswerFeedbackDTO {
    id: number;
    userAnswerId: number;
    feedbackText: string;
    score: number;
    elementDone: boolean;
    progress: number;
}

export interface UserFillinAnswer {
    position: string;
    answer: string;
}

export interface UserUploadAnswer {
    id?: number;
    userAnswerId?: number;
    fileId?: number;
    file?: FileUploadDTO;
}
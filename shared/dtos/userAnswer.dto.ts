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
    userFillinTextAnswer?: UserFillinAnswerDTO[];
    userGraphAnswer?: GraphStructureDTO[];
    codeGameEvaluation?: CodeGameEvaluationDTO;
    userUploadAnswer?: UserUploadAnswerDTO;
    userUploadFileId?: number;
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

export interface UserFillinAnswerDTO {
    position: string;
    answer: string;
}

export interface UserUploadAnswerDTO {
    id?: number;
    userAnswerId?: number;
    fileId?: number;
    file?: FileUploadDTO;
}

export interface UserUploadAnswerListItemDTO {
    conceptId: number;
    conceptTitle: string;
    questionId: number;
    questionTitle: string;
    userId: number;
    userMail: string;
    fileUniqueIdentifier?: string;
    fileName?: string;
    uploadDate?: Date;
}
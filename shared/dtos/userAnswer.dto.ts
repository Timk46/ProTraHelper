import { GraphStructureDTO } from "./graphTask.dto";
import { CodeGameEvaluationDTO } from "./codeGame.dto";

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
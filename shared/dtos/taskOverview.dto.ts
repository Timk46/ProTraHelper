import { userAnswerFeedbackDTO } from "./userAnswer.dto";

export interface taskOverviewElementDTO {
    id: number;
    name?: string;
    description?: string;
    type: string;
    attempts: number;
    progress: number;
    feedback?: userAnswerFeedbackDTO[];
}
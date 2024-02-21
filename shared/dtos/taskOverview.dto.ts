import { userAnswerFeedbackDTO } from "./userAnswer.dto";

export interface taskOverviewElementDTO {
    id: number;
    name?: string;
    description?: string;
    type: string;
    mode: string;
    level: number;
    attempts: number;
    progress: number;
    feedback?: userAnswerFeedbackDTO[];
}
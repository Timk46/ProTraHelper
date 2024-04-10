export interface UserAnswerDataDTO {
    id: number;
    contentElementId?: number;
    userId: number;
    questionId: number;
    userFreetextAnswer?: string;
    userFreetextAnswerRaw?: string;
    userMCAnswer?: number[];
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
}
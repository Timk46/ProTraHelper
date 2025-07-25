export interface CreateEvaluationRatingDTO {
  submissionId: string;
  categoryId: number;
  score: number; // 0-10
  comment?: string;
}

export interface UpdateEvaluationRatingDTO {
  score: number; // 0-10
  comment?: string;
}
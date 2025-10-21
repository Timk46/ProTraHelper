export interface CreateEvaluationCommentDTO {
  submissionId: number;
  categoryId?: number;
  content: string;
  parentId?: number; // For replies
}

export interface UpdateEvaluationCommentDTO {
  content: string;
}
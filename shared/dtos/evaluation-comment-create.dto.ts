export interface CreateEvaluationCommentDTO {
  submissionId: string;
  categoryId?: number;
  content: string;
  parentId?: string; // For replies
}

export interface UpdateEvaluationCommentDTO {
  content: string;
}
export interface CreateEvaluationSubmissionDTO {
  title: string;
  description?: string;
  pdfFileId: number;
  sessionId: number;
}

export interface UpdateEvaluationSubmissionDTO {
  title?: string;
  description?: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'DISCUSSION' | 'COMPLETED';
}
export interface GroupReviewGateStatusDTO {
  gateId: number;
  gateName: string;
  linkedQuestionId: number;
  linkedQuestionName: string;
  conceptId: number;
  conceptName: string;
  totalStudents: number;
  submittedStudents: number;
}

export interface CreateGroupReviewSessionsDTO {
  gateIds: number[];
  sessionTitle: string;
  reviewDeadline: Date;
}

export interface CreateGroupReviewSessionsResultDTO {
  createdSessions: number;
  createdSubmissions: number;
  errors: string[];
}

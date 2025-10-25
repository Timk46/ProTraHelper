/**
 * Modelle für Code-Submission und Feedback im tutor-kai Modul
 */

import { TestResultDTO, CodeSubmissionResultDto as CodeSubmissionResultDtoImport } from '@DTOs/index';

// Re-export for backward compatibility
export type TestResult = TestResultDTO;
export type CodeSubmissionResult = CodeSubmissionResultDtoImport['CodeSubmissionResult'];
export type CodeSubmissionResultDto = CodeSubmissionResultDtoImport;

export enum FeedbackLevel {
  LOW = 'Wenig Unterstützung',
  STANDARD = 'Standard Unterstützung',
  HIGH = 'Viel Unterstützung',
}

export enum FlavorType {
  STANDARD = 'Standard Feedback',
  CONCEPT = 'Feedback mit Konzept-Erklärung',
}

export enum WorkspaceState {
  START = 'start',
  EDITING_CODE = 'editingCode',
  SUBMITTED_CODE = 'submittedCode',
  GENERATING_FEEDBACK = 'generatingFeedback',
  RECEIVING_FEEDBACK = 'receivingFeedback',
  FINISHED_FEEDBACK = 'finishedFeedback',
  FEEDBACK_RATED = 'feedbackRated',
}

export interface FeedbackRating {
  rating: number;
  comment: string;
  submissionId: string;
}

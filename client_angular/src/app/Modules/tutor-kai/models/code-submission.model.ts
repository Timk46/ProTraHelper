/**
 * Modelle für Code-Submission und Feedback im tutor-kai Modul
 */

export interface TestResult {
  name: string;
  passed: boolean;
  exception?: string;
}

export interface CodeSubmissionResult {
  CodeSubmissionResult: {
    output: string | null;
    score: number;
    testResults?: TestResult[];
    testsPassed?: boolean;
  };
  encryptedCodeSubissionId: string;
}

// Entspricht dem DTO auf der Server-Seite
export type CodeSubmissionResultDto = CodeSubmissionResult;

export enum FeedbackLevel {
  LOW = 'Wenig Unterstützung',
  STANDARD = 'Standard Unterstützung',
  HIGH = 'Viel Unterstützung'
}

export enum FlavorType {
  STANDARD = 'Standard Feedback',
  CONCEPT = 'Feedback mit Konzept-Erklärung'
}

export enum WorkspaceState {
  START = 'start',
  EDITING_CODE = 'editingCode',
  SUBMITTED_CODE = 'submittedCode',
  GENERATING_FEEDBACK = 'generatingFeedback',
  RECEIVING_FEEDBACK = 'receivingFeedback',
  FINISHED_FEEDBACK = 'finishedFeedback',
  FEEDBACK_RATED = 'feedbackRated'
}

export interface FeedbackRating {
  rating: number;
  comment: string;
  submissionId: string;
}

// Removed unused FeedbackCategory, FeedbackQuestion interfaces and FEEDBACK_CATEGORIES constant

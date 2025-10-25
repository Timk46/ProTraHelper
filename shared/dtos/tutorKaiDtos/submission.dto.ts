import { KIFeedbackDto } from './kiFeedback.dto';

/**
 * Code submission data transfer object
 *
 * @interface CodeSubmissionDto
 */
export interface CodeSubmissionDto {
  id: number;
  code: string;
  updatedAt: Date;
  createdAt: Date;
  compilerOutput: string;
  compilerError: string;
  compilerResponse: string;
  userId: number;
  CodeSubmissionFiles: CodeSubmissionFileDto[];
  KIFeedbacks: KIFeedbackDto[];
}

/**
 * Code submission file data transfer object
 *
 * @interface CodeSubmissionFileDto
 */
export interface CodeSubmissionFileDto {
  id: number;
  updatedAt: Date;
  createdAt: Date;
  version: number;
  code?: string;
  language?: string;
  codeFileName?: string;
  userId: number;
  codeSubmissionId: number;
}

/**
 * Unified test result interface for both frontend and backend
 *
 * @interface TestResultDTO
 */
export interface TestResultDTO {
  // Frontend variant fields
  name?: string;
  passed?: boolean;
  // Backend variant fields
  test?: string;
  status?: 'PASSED' | 'FAILED';
  // Common field
  exception?: string;
}

/**
 * Code submission result data
 *
 * @interface CodeSubmissionResult
 */
export interface CodeSubmissionResult{
  output: string | null;
  testResults?: TestResultDTO[];
  testsPassed?: boolean;
  score: number;
}

/**
 * Code submission result data transfer object
 *
 * @interface CodeSubmissionResultDto
 */
export interface CodeSubmissionResultDto {
  CodeSubmissionResult: CodeSubmissionResult;
  encryptedCodeSubissionId: string;
}

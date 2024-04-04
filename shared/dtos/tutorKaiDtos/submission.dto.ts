import { KIFeedbackDto } from './kiFeedback.dto';
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

export interface CodeSubmissionResult{
  testResults: TestResult[];
  testsPassed: boolean;
  score: number;
}

export interface CodeSubmissionResultDto {
  CodeSubmissionResult: CodeSubmissionResult;
  encryptedCodeSubissionId: string;

}


interface TestResult {
  test: string;
  status: 'PASSED' | 'FAILED'; // Angenommen, dass dies die möglichen Werte sind.
  exception: string;
}
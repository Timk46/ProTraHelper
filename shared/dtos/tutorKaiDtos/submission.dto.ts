import { Judge0Dto } from './judge0.dto';
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

export interface CodeSubmissionResultDto {
  resultjudge0: Judge0Dto;
  encryptedSubmissionId: string;
}

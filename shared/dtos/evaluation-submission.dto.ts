import { userDTO } from './user.dto';
import { fileDTO } from './file.dto';
import { moduleDTO } from './module.dto';

export enum EvaluationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW', 
  DISCUSSION = 'DISCUSSION',
  COMPLETED = 'COMPLETED'
}

export enum EvaluationPhase {
  DISCUSSION = 'DISCUSSION',
  EVALUATION = 'EVALUATION'
}

export interface EvaluationSubmissionDTO {
  id: string;
  title: string;
  authorId: number;
  pdfFileId: number;
  moduleId: number;
  status: EvaluationStatus;
  phase: EvaluationPhase;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  author?: userDTO;
  pdfFile?: fileDTO;
  module?: moduleDTO;
  
  // PDF Metadata
  pdfMetadata?: {
    pageCount: number;
    fileSize: number;
    downloadUrl?: string;
  };
}
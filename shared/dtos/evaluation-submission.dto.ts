import { UserDTO } from './user.dto';
import { FileDto } from './file.dto';
import { ModuleDTO } from './module.dto';

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
  id: number;
  title: string;
  description?: string;
  authorId: number;
  pdfFileId: number;
  sessionId: number;
  status: EvaluationStatus;
  phase: EvaluationPhase;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
 
  
  // Relations
  author?: UserDTO;
  pdfFile?: FileDto;
  session?: {
    id: number;
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    moduleId: number;
    phase: EvaluationPhase;
    isActive: boolean;
    isAnonymous: boolean;
  };
  discussions?: any[];
  ratings?: any[];
  _count?: {
    discussions?: number;
    ratings?: number;
  };
  
  // PDF Metadata
  pdfMetadata?: {
    pageCount: number;
    fileSize: number;
    downloadUrl?: string;
  };
}
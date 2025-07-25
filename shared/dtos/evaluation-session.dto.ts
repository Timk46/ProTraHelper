import { UserDTO } from './user.dto';
import { ModuleDTO } from './module.dto';
import { EvaluationSubmissionDTO, EvaluationPhase } from './evaluation-submission.dto';
import { EvaluationCategoryDTO } from './evaluation-category.dto';

export interface EvaluationSessionDTO {
  id: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  moduleId: number;
  createdById: number;
  isActive: boolean;
  isAnonymous: boolean;
  phase: EvaluationPhase;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  module?: ModuleDTO;
  createdBy?: UserDTO;
  submissions?: EvaluationSubmissionDTO[];
  categories?: EvaluationCategoryDTO[];
  
  // Counts
  _count?: {
    submissions: number;
    categories: number;
  };
}

export interface CreateEvaluationSessionDTO {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  moduleId: number;
  isAnonymous?: boolean;
}

export interface UpdateEvaluationSessionDTO {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  isAnonymous?: boolean;
  phase?: EvaluationPhase;
}
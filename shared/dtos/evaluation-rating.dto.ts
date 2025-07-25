import { UserDTO } from './user.dto';
import { EvaluationSubmissionDTO } from './evaluation-submission.dto';
import { EvaluationCategoryDTO } from './evaluation-category.dto';

export interface EvaluationRatingDTO {
  id: string;
  submissionId: string;
  userId: number;
  categoryId: number;
  score: number; // 0-10 points
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  submission?: EvaluationSubmissionDTO;
  user?: UserDTO;
  category?: EvaluationCategoryDTO;
}

// CreateRatingDTO and UpdateRatingDTO are now defined in evaluation-rating-create.dto.ts
// to avoid duplicate exports

export interface RatingStatsDTO {
  submissionId: string;
  categoryId: number;
  
  // Statistics
  averageScore: number;
  totalRatings: number;
  scoreDistribution: {
    score: number;
    count: number;
  }[];
  
  // User's rating
  userRating?: number;
  userHasRated: boolean;
}

export interface RatingSubmissionResultDTO {
  submissionId: string;
  isCompleted: boolean;
  
  // Category ratings
  categoryRatings: {
    categoryId: number;
    categoryName: string;
    userRating?: number;
    averageRating: number;
    isRequired: boolean;
    isCompleted: boolean;
  }[];
  
  // Overall statistics
  overallAverage: number;
  completionProgress: number; // 0-100%
  canFinalize: boolean;
}

// Rating slider configuration
export interface RatingSliderConfig {
  min: number;
  max: number;
  step: number;
  thumbLabel: boolean;
  showTicks: boolean;
  tickInterval: number;
  
  // Color configuration
  colors: {
    poor: string;     // 0-3
    average: string;  // 4-6
    good: string;     // 7-8
    excellent: string; // 9-10
  };
}
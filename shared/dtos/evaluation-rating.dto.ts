import { UserDTO } from './user.dto';
import { EvaluationSubmissionDTO } from './evaluation-submission.dto';
import { EvaluationCategoryDTO } from './evaluation-category.dto';

export interface EvaluationRatingDTO {
  id: number;
  submissionId: number;
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
  submissionId: number;
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
  submissionId: number;
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

// Category rating status for access control
export interface CategoryRatingStatus {
  categoryId: number;
  categoryName: string;
  displayName: string;
  hasRated: boolean;
  rating: number | null;
  ratedAt: Date | null;
  lastUpdatedAt: Date | null;
  canAccessDiscussion: boolean;
  isRequired: boolean;
}

// Response for checking if user has rated a category
export interface HasRatedResponse {
  hasRated: boolean;
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
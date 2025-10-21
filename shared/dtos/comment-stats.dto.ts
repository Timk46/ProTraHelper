export interface CategoryStatsDTO {
  categoryId: number;
  categoryName: string;
  availableComments: number;
  usedComments: number;
  isLimitReached: boolean;
  lastCommentAt?: Date;
  
  // Color indicators based on availability
  indicatorColor: 'success' | 'warn' | 'error' | 'primary';
  
  // Availability display
  availabilityText: string; // e.g., "2/3 verfügbar"
  availabilityIcon: 'add' | 'remove' | 'block';
}

export interface CommentStatsDTO {
  submissionId: number;
  totalAvailable: number;
  totalUsed: number;
  
  // Per-category statistics
  categories: CategoryStatsDTO[];
  
  // Overall statistics
  overallProgress: number; // 0-100%
  averageUsage: number;
  
  // User limits
  userLimits: {
    userId: number;
    totalLimit: number;
    totalUsed: number;
    canComment: boolean;
    resetAt?: Date;
  };
}

export interface CommentLimitDTO {
  id: number;
  submissionId: number;
  userId: number;
  categoryId: number;
  availableCount: number;
  usedCount: number;
  resetAt?: Date;
  lastUsedAt?: Date;
}

export interface CommentLimitUpdateDTO {
  categoryId: number;
  usedCount: number;
  lastUsedAt: Date;
}

// Extended stats for UI display
export interface CommentStatsDisplayDTO extends CommentStatsDTO {
  // Visual indicators
  showLimitWarning: boolean;
  showSuccessState: boolean;
  showErrorState: boolean;
  
  // Formatted strings for display
  formattedStats: {
    categoryId: number;
    displayText: string;
    badgeColor: string;
    tooltipText: string;
  }[];
}
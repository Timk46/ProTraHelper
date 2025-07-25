import { Injectable } from '@nestjs/common';

@Injectable()
export class EvaluationUtilsService {
  
  /**
   * Calculate vote statistics for comments
   */
  calculateVoteStats(votes: Array<{ isUpvote: boolean; userId: number }>): {
    upVotes: number;
    downVotes: number;
    totalVotes: number;
    score: number;
  } {
    const upVotes = votes.filter(v => v.isUpvote).length;
    const downVotes = votes.filter(v => !v.isUpvote).length;
    const totalVotes = votes.length;
    const score = upVotes - downVotes;

    return {
      upVotes,
      downVotes,
      totalVotes,
      score,
    };
  }

  /**
   * Calculate vote statistics for multiple comments at once
   */
  calculateBatchVoteStats(
    commentVotes: Array<{ messageId: number; votes: Array<{ isUpvote: boolean; userId: number }> }>
  ): Record<number, { upVotes: number; downVotes: number; totalVotes: number; score: number }> {
    const result: Record<number, { upVotes: number; downVotes: number; totalVotes: number; score: number }> = {};

    for (const { messageId, votes } of commentVotes) {
      result[messageId] = this.calculateVoteStats(votes);
    }

    return result;
  }

  /**
   * Generate anonymous user display name
   */
  generateAnonymousDisplayName(): string {
    const anonymousNames = [
      'Teilnehmer', 'Bewerter', 'Diskutant', 'Reviewer', 'Kommentator',
      'Analyst', 'Kritiker', 'Prüfer', 'Evaluator', 'Gutachter'
    ];

    const randomName = anonymousNames[Math.floor(Math.random() * anonymousNames.length)];
    const suffix = Math.floor(Math.random() * 1000);

    return `${randomName} ${suffix}`;
  }

  /**
   * Generate color code for anonymous users
   */
  generateColorCode(userId: number): string {
    const colors = [
      '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336',
      '#3F51B5', '#009688', '#FF5722', '#607D8B', '#795548'
    ];

    // Use user ID to generate consistent color
    const colorIndex = userId % colors.length;
    return colors[colorIndex];
  }

  /**
   * Calculate rating score distribution
   */
  calculateScoreDistribution(ratings: Array<{ score: number }>): Array<{ score: number; count: number }> {
    const distribution: Record<number, number> = {};

    // Initialize distribution for scores 0-10
    for (let i = 0; i <= 10; i++) {
      distribution[i] = 0;
    }

    // Count ratings
    for (const rating of ratings) {
      if (rating.score >= 0 && rating.score <= 10) {
        distribution[rating.score]++;
      }
    }

    // Convert to array format
    return Object.entries(distribution).map(([score, count]) => ({
      score: Number(score),
      count,
    }));
  }

  /**
   * Calculate average rating
   */
  calculateAverageRating(ratings: Array<{ score: number }>): number {
    if (ratings.length === 0) return 0;

    const total = ratings.reduce((sum, rating) => sum + rating.score, 0);
    return Math.round((total / ratings.length) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Validate submission ID format
   */
  isValidSubmissionId(id: string): boolean {
    // Check if it's a valid UUID or numeric ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const numericRegex = /^\d+$/;
    
    return uuidRegex.test(id) || numericRegex.test(id);
  }

  /**
   * Generate cache key for evaluation data
   */
  generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Sanitize text content
   */
  sanitizeContent(content: string): string {
    // Basic sanitization - remove HTML tags and trim
    return content.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Calculate comment reply tree depth
   */
  calculateReplyDepth(comments: Array<{ id: string; parentId?: string }>): Record<string, number> {
    const depths: Record<string, number> = {};
    const visited = new Set<string>();

    const calculateDepth = (commentId: string): number => {
      if (visited.has(commentId)) return 0; // Prevent infinite loops
      visited.add(commentId);

      const comment = comments.find(c => c.id === commentId);
      if (!comment || !comment.parentId) {
        depths[commentId] = 0;
        return 0;
      }

      const parentDepth = depths[comment.parentId] ?? calculateDepth(comment.parentId);
      depths[commentId] = parentDepth + 1;
      return depths[commentId];
    };

    for (const comment of comments) {
      if (!visited.has(comment.id)) {
        calculateDepth(comment.id);
      }
    }

    return depths;
  }

  /**
   * Check if user can perform action based on phase
   */
  canPerformAction(
    action: 'comment' | 'rate' | 'vote',
    currentPhase: 'DISCUSSION' | 'EVALUATION'
  ): boolean {
    switch (action) {
      case 'comment':
        return currentPhase === 'DISCUSSION';
      case 'rate':
        return currentPhase === 'EVALUATION';
      case 'vote':
        return true; // Voting allowed in both phases
      default:
        return false;
    }
  }
}
/**
 * Represents the aggregated learner model data provided to the feedback supervisor.
 */
export interface LearnerModelDto {
  /**
   * Performance metrics related to the concept associated with the current task.
   */
  performanceOnCurrentConcept: {
    attempts: number; // Total attempts on questions for this concept
    avgScore: number | null; // Average score across attempts
    commonErrorTypes: string[]; // List of common error types encountered
    lastFeedbackTypes: string[]; // Types of feedback received recently for this concept
  } | null; // Null if no concept is associated or no history exists

  /**
   * Performance and status related to prerequisite concepts.
   */
  performanceOnPrerequisites: {
    conceptId: number;
    conceptName: string;
    level: number | null; // Assessed mastery level from UserConcept
    recentStruggles: boolean; // Flag indicating recent low scores or high attempts
  }[];

  /**
   * Overall performance metrics across all coding questions attempted by the user.
   */
  overallCodingPerformance: {
    totalSubmissions: number;
    overallAvgScore: number | null;
  };

  /**
   * Information about the student's recent activity.
   */
  recentActivity: {
    lastSubmissionDate: Date | null; // Timestamp of the very last submission
    timeSinceLastAttemptSeconds: number | null; // Time elapsed since the last attempt on *this specific task*
  };

  /**
   * A concise narrative summary of the student's interaction with the *current specific task*,
   * focusing on attempt count, error trajectory, feedback sequence, and responsiveness.
   * Generated on-the-fly. Null if this is the first attempt.
   */
  taskHistorySummary: string | null;
}
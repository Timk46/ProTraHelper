/**
 * Represents the analytics data for a student's progress
 */
export interface StudentProgressAnalytics {
  /** ID of the user */
  userId: string;

  /** Name of the student */
  studentName: string;

  /** Number of completed lessons */
  completedLessons: number;

  /** Total number of lessons in the course */
  totalLessons: number;

  /** Percentage of lessons completed */
  progressPercentage: number;

  /** Number of models submitted for review */
  modelsSubmitted: number;

  /** Number of reviews submitted for other students' models */
  reviewsSubmitted: number;

  /** Average score across all peer reviews received */
  averagePeerScore: number;

  /** Skills assessment as rated by peers and AI */
  skills: SkillRating[];

  /** Last activity timestamp */
  lastActivity: Date;
}

/**
 * Represents a rating for a specific skill
 */
export interface SkillRating {
  /** ID of the skill */
  skillId: string;

  /** Name of the skill */
  skillName: string;

  /** Score for the skill (0-100) */
  score: number;

  /** Comments on this skill from reviews */
  comments: string[];
}

/**
 * Represents analytics data for an entire course
 */
export interface CourseAnalytics {
  /** ID of the course */
  courseId: string;

  /** Name of the course */
  courseName: string;

  /** Number of students enrolled */
  enrolledStudents: number;

  /** Number of students who have submitted at least one model */
  activeStudents: number;

  /** Average progress percentage across all students */
  averageProgress: number;

  /** Total number of models submitted */
  totalModelsSubmitted: number;

  /** Total number of peer reviews completed */
  totalReviewsCompleted: number;

  /** Average score across all models */
  averageModelScore: number;

  /** Distribution of scores by range */
  scoreDistribution: {
    range: string;
    count: number;
  }[];

  /** Most common feedback themes from reviews */
  commonFeedbackThemes: {
    theme: string;
    occurrences: number;
  }[];
}

/**
 * Represents a time-series data point for tracking metrics over time
 */
export interface AnalyticsTimePoint {
  /** The timestamp of the data point */
  timestamp: Date;

  /** The value at that timestamp */
  value: number;
}

/**
 * Represents analytics for a lesson
 */
export interface LessonAnalytics {
  /** ID of the lesson */
  lessonId: string;

  /** Name of the lesson */
  lessonName: string;

  /** Percentage of students who have completed the lesson */
  completionRate: number;

  /** Average time spent on the lesson */
  averageTimeSpent: number;

  /** Number of models submitted for this lesson */
  modelsSubmitted: number;

  /** Average peer review score for models in this lesson */
  averageModelScore: number;

  /** Most challenging aspects based on peer reviews */
  challengingAspects: {
    aspect: string;
    occurrences: number;
  }[];
}

/**
 * Default skill categories for architectural model evaluation
 */
export const DEFAULT_ARCHITECTURE_SKILLS: { id: string; name: string }[] = [
  {
    id: 'structural-understanding',
    name: 'Strukturelles Verständnis',
  },
  {
    id: 'design-creativity',
    name: 'Design-Kreativität',
  },
  {
    id: 'technical-precision',
    name: 'Technische Präzision',
  },
  {
    id: 'parameter-optimization',
    name: 'Parameteroptimierung',
  },
  {
    id: 'construction-knowledge',
    name: 'Konstruktionswissen',
  },
];

/**
 * Represents a rubric criterion for peer review
 */
export interface ReviewCriterion {
  /** Unique identifier for the criterion */
  id: string;

  /** Name of the criterion */
  name: string;

  /** Description of what to evaluate */
  description: string;

  /** The weight of this criterion in the overall score (0-100) */
  weight: number;

  /** The maximum possible score for this criterion */
  maxScore: number;
}

/**
 * Represents a single review by a peer
 */
export interface PeerReview {
  /** Unique identifier for the review */
  id?: string;

  /** The ID of the user who created the review */
  reviewerId: string;

  /** The ID of the model being reviewed */
  modelId: string;

  /** The ID of the user who created the model */
  modelOwnerId: string;

  /** The date when the review was created */
  createdAt: Date;

  /** The scores given for each criterion */
  scores: CriterionScore[];

  /** Any comments provided by the reviewer */
  comments: string;

  /** Whether the review is complete and submitted */
  isComplete: boolean;
}

/**
 * Represents a score for a single criterion
 */
export interface CriterionScore {
  /** The ID of the criterion */
  criterionId: string;

  /** The score given (0 to criterion's maxScore) */
  score: number;

  /** Optional specific feedback for this criterion */
  feedback?: string;
}

/**
 * Represents a summary of reviews for a model
 */
export interface ReviewSummary {
  /** The ID of the model */
  modelId: string;

  /** The number of reviews */
  reviewCount: number;

  /** The average overall score (0-100) */
  averageScore: number;

  /** Average scores per criterion */
  criterionScores: {
    criterionId: string;
    averageScore: number;
  }[];

  /** All comments from reviews, grouped by criterion */
  comments: {
    criterionId: string;
    comments: string[];
  }[];
}

/**
 * Default rubric criteria for architecture model evaluation
 */
export const DEFAULT_REVIEW_CRITERIA: ReviewCriterion[] = [
  {
    id: 'structural-integrity',
    name: 'Strukturelle Integrität',
    description: 'Bewerten Sie, wie gut das Modell strukturellen Belastungen standhält.',
    weight: 30,
    maxScore: 5,
  },
  {
    id: 'design-concept',
    name: 'Designkonzept',
    description: 'Bewerten Sie die Originalität und Kohärenz des Entwurfskonzepts.',
    weight: 25,
    maxScore: 5,
  },
  {
    id: 'technical-execution',
    name: 'Technische Ausführung',
    description: 'Bewerten Sie die technische Qualität und Detailgenauigkeit des Modells.',
    weight: 25,
    maxScore: 5,
  },
  {
    id: 'parameter-usage',
    name: 'Parameternutzung',
    description: 'Bewerten Sie, wie effektiv parametrische Elemente eingesetzt wurden.',
    weight: 20,
    maxScore: 5,
  },
];

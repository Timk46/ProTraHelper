export interface Answer {
  answer?: string;
  correct?: boolean;
}

export interface McqEvaluation {
  correct?: boolean;
  reasoning?: string;
}

export interface McqEvaluations {
  evaluations?: McqEvaluation[];
}

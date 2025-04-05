export interface FeedbackContextDto {
  studentSolution: string;
  taskDescription: string;
  compilerOutput: string | null;
  unitTestResults: any | null;
  attemptCount: number;
  automatedTests?: any[]; // Optional based on graph state definition
  codeGerueste?: any[]; // Optional based on graph state definition
}

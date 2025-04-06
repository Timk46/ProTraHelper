export interface FeedbackContextDto {
  studentSolution: string;
  taskDescription: string;
  compilerOutput: string | null;
  unitTestResults: any | null; // Consider defining a more specific type if possible
  attemptCount: number;
  automatedTests?: any[]; // Optional based on graph state definition
  codeGerueste?: any[]; // Optional based on graph state definition
  modelSolution?: any[]; 
  // Removed learnerModel property
}

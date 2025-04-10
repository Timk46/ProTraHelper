import { AutomatedTestDto, CodeGeruestDto, ModelSolutionDto } from '@DTOs/question.dto';

export interface FeedbackContextDto {
  studentSolution: string;
  taskDescription: string;
  compilerOutput: string | null;
  unitTestResults: any | null; // Consider defining a more specific type if possible
  attemptCount: number;
  automatedTests?: AutomatedTestDto[]; // Optional based on graph state definition
  codeGerueste?: CodeGeruestDto[]; // Optional based on graph state definition
  modelSolution?: ModelSolutionDto[];
  // Removed learnerModel property
  codeSubmissionId: number; // Added to link feedback back to the submission
}

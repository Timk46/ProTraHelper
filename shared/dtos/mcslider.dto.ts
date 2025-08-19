/**
 * MCSlider DTOs - Pure TypeScript Interfaces
 * Keine class-validator oder class-transformer Dependencies
 */

// MCSlider Item Interface
export interface MCSliderItemDTO {
  text: string;
  correctValue: number;
  minValue: number;
  maxValue: number;
  stepSize: number;
  unit?: string;
  tolerance?: number;
}

// MCSlider Configuration Interface
export interface MCSliderConfigDTO {
  showLabels: boolean;
  showValues: boolean;
  allowPartialCredit: boolean;
  randomizeOrder: boolean;
  theme?: string;
}

// MCSlider Rhino Configuration Interface
export interface MCSliderRhinoConfigDTO {
  enabled: boolean;
  grasshopperFile?: string;
  autoLaunch?: boolean;
  autoFocus?: boolean;
  focusDelayMs?: number;
}

// Create MCSlider Question Interface
export interface CreateMCSliderQuestionDTO {
  title: string;
  text: string;
  maxPoints: number;
  items: MCSliderItemDTO[];
  config: MCSliderConfigDTO;
  rhinoIntegration?: MCSliderRhinoConfigDTO;
}

// MCSlider Item Response Interface
export interface MCSliderItemResponseDTO {
  itemIndex: number;
  userValue: number;
  correctValue: number;
  isCorrect: boolean;
  partialCredit: number;
  feedback?: string;
}

// MCSlider Submission Interface
export interface MCSliderSubmissionDTO {
  questionId: number;
  responses: MCSliderItemResponseDTO[];
  timestamp: string;
  sessionId?: string;
}

// Update MCSlider Question Interface
export interface UpdateMCSliderQuestionDTO {
  title?: string;
  text?: string;
  maxPoints?: number;
  items?: MCSliderItemDTO[];
  config?: MCSliderConfigDTO;
  rhinoIntegration?: MCSliderRhinoConfigDTO;
}

// MCSlider Question Response Interface (for API responses)
export interface MCSliderQuestionResponseDTO {
  id: number;
  title: string;
  text: string;
  maxPoints: number;
  items: MCSliderItemDTO[];
  config: MCSliderConfigDTO;
  rhinoIntegration?: MCSliderRhinoConfigDTO;
  createdAt: Date;
  updatedAt: Date;
}

// MCSlider Submission Result Interface
export interface MCSliderSubmissionResultDTO {
  questionId: number;
  responses: MCSliderItemResponseDTO[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  timestamp: string;
}

// Rhino Execution Result Interface
export interface RhinoExecutionResultDTO {
  success: boolean;
  message: string;
  rhinoPath?: string;
  processId?: number;
  executionTime?: number;
}

import { EvaluationPhase } from './evaluation-submission.dto';

/**
 * Data Transfer Object for phase switching schedule
 * @description Represents a scheduled phase switch between discussion and evaluation phases
 */
export interface PhaseSwitchScheduleDTO {
  id: string;
  targetPhase: EvaluationPhase;
  switchTime: Date;
  createdAt: Date;
  isActive: boolean;
  description?: string;
}

export interface PhaseSwitchScheduleDisplayDTO extends PhaseSwitchScheduleDTO {
  timeRemaining: string;
  progressPercentage: number;
  canCancel: boolean;
}
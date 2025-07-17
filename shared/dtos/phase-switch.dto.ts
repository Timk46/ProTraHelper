import { EvaluationPhase } from './evaluation-submission.dto';

export interface PhaseSwitchRequestDTO {
  submissionId: string;
  targetPhase: EvaluationPhase;
  reason?: string;
}

export interface PhaseSwitchResponseDTO {
  submissionId: string;
  previousPhase: EvaluationPhase;
  currentPhase: EvaluationPhase;
  switchedAt: Date;
  canSwitch: boolean;
  
  // Phase restrictions
  restrictions: {
    discussionPhase: {
      canComment: boolean;
      canVote: boolean;
      canViewComments: boolean;
    };
    evaluationPhase: {
      canRate: boolean;
      canFinalizeRating: boolean;
      canViewRatings: boolean;
    };
  };
}

export interface PhaseInfoDTO {
  phase: EvaluationPhase;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  
  // Phase capabilities
  capabilities: {
    commenting: boolean;
    voting: boolean;
    rating: boolean;
    finalizing: boolean;
  };
  
  // UI display
  badgeText: string;
  badgeColor: 'primary' | 'accent' | 'warn' | 'success';
  actionText: string; // e.g., "Zu Phase 1 wechseln"
}

export interface PhaseToggleStateDTO {
  currentPhase: EvaluationPhase;
  canSwitchTo: EvaluationPhase[];
  
  // Phase information
  phases: {
    discussion: PhaseInfoDTO;
    evaluation: PhaseInfoDTO;
  };
  
  // Toggle button state
  toggleButton: {
    text: string;
    icon: string;
    color: string;
    disabled: boolean;
    tooltip: string;
  };
}

// Phase transition events
export interface PhaseTransitionEventDTO {
  type: 'phase-switched';
  submissionId: string;
  previousPhase: EvaluationPhase;
  currentPhase: EvaluationPhase;
  switchedAt: Date;
  userId: number;
}

// Default phase configurations
export const PHASE_CONFIGS: Record<EvaluationPhase, PhaseInfoDTO> = {
  [EvaluationPhase.DISCUSSION]: {
    phase: EvaluationPhase.DISCUSSION,
    displayName: 'Diskussion',
    description: 'Diskussion und Kommentierung der Abgabe',
    icon: 'chat',
    color: '#2196F3',
    capabilities: {
      commenting: true,
      voting: true,
      rating: false,
      finalizing: false
    },
    badgeText: 'Diskussion',
    badgeColor: 'primary',
    actionText: 'Zur Bewertung wechseln'
  },
  [EvaluationPhase.EVALUATION]: {
    phase: EvaluationPhase.EVALUATION,
    displayName: 'Bewertung',
    description: 'Bewertung der Abgabe mit Punktevergabe',
    icon: 'star',
    color: '#FF9800',
    capabilities: {
      commenting: false,
      voting: false,
      rating: true,
      finalizing: true
    },
    badgeText: 'Bewertung',
    badgeColor: 'accent',
    actionText: 'Zur Diskussion wechseln'
  }
};
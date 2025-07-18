import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material Imports
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';

// DTOs
import { PhaseSwitchDTO } from '@dtos';

@Component({
  selector: 'app-phase-toggle',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCardModule,
    MatChipsModule,
    MatBadgeModule
  ],
  templateUrl: './phase-toggle.component.html',
  styleUrl: './phase-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhaseToggleComponent {
  
  // =============================================================================
  // INPUTS - CONFIGURATION FROM PARENT
  // =============================================================================
  
  @Input() currentPhase: 'discussion' | 'evaluation' = 'discussion';
  @Input() phaseSwitch: PhaseSwitchDTO | null = null;
  @Input() disabled: boolean = false;
  @Input() showLabels: boolean = true;
  @Input() showDescription: boolean = true;
  @Input() compactMode: boolean = false;
  @Input() discussionCount: number = 0;
  @Input() evaluationCount: number = 0;

  // =============================================================================
  // OUTPUTS - EVENTS TO PARENT
  // =============================================================================
  
  @Output() phaseChanged = new EventEmitter<'discussion' | 'evaluation'>();

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================
  
  onPhaseToggle(newPhase: 'discussion' | 'evaluation'): void {
    if (!this.disabled && newPhase !== this.currentPhase) {
      this.phaseChanged.emit(newPhase);
    }
  }

  // =============================================================================
  // TEMPLATE HELPER METHODS
  // =============================================================================
  
  /**
   * Gets the phase display information
   */
  getPhaseInfo(phase: 'discussion' | 'evaluation'): {
    title: string;
    description: string;
    icon: string;
    color: string;
  } {
    const phaseInfo = {
      discussion: {
        title: 'Diskussion',
        description: 'Kommentare und Diskussionen zu Bewertungen',
        icon: 'forum',
        color: 'primary'
      },
      evaluation: {
        title: 'Bewertung',
        description: 'Bewertungen zu verschiedenen Kategorien abgeben',
        icon: 'star_rate',
        color: 'accent'
      }
    };
    
    return phaseInfo[phase];
  }

  /**
   * Gets the tooltip text for a phase
   */
  getPhaseTooltip(phase: 'discussion' | 'evaluation'): string {
    if (this.disabled) {
      return 'Phasenwechsel ist momentan nicht möglich';
    }
    
    const info = this.getPhaseInfo(phase);
    
    if (phase === this.currentPhase) {
      return `Aktuelle Phase: ${info.title}`;
    }
    
    return `Zu ${info.title} wechseln: ${info.description}`;
  }

  /**
   * Gets the badge count for a phase
   */
  getPhaseBadgeCount(phase: 'discussion' | 'evaluation'): number {
    return phase === 'discussion' ? this.discussionCount : this.evaluationCount;
  }

  /**
   * Checks if a phase has content
   */
  hasPhaseContent(phase: 'discussion' | 'evaluation'): boolean {
    return this.getPhaseBadgeCount(phase) > 0;
  }

  /**
   * Gets the badge text for a phase
   */
  getPhaseBadgeText(phase: 'discussion' | 'evaluation'): string {
    const count = this.getPhaseBadgeCount(phase);
    
    if (phase === 'discussion') {
      return count === 1 ? '1 Kommentar' : `${count} Kommentare`;
    } else {
      return count === 1 ? '1 Bewertung' : `${count} Bewertungen`;
    }
  }

  /**
   * Gets the current phase status
   */
  getCurrentPhaseStatus(): string {
    if (this.phaseSwitch) {
      const currentTime = new Date();
      const switchTime = new Date(this.phaseSwitch.switchTime);
      
      if (currentTime < switchTime) {
        const timeDiff = switchTime.getTime() - currentTime.getTime();
        const hoursLeft = Math.ceil(timeDiff / (1000 * 60 * 60));
        
        return `Automatischer Wechsel in ${hoursLeft} Stunden`;
      } else {
        return 'Phase kann gewechselt werden';
      }
    }
    
    return '';
  }

  /**
   * Checks if automatic phase switch is active
   */
  hasAutomaticSwitch(): boolean {
    return this.phaseSwitch !== null;
  }

  /**
   * Gets the automatic switch information
   */
  getAutomaticSwitchInfo(): {
    targetPhase: 'discussion' | 'evaluation';
    timeRemaining: string;
    isActive: boolean;
  } | null {
    if (!this.phaseSwitch) {
      return null;
    }
    
    const currentTime = new Date();
    const switchTime = new Date(this.phaseSwitch.switchTime);
    const isActive = currentTime < switchTime;
    
    if (!isActive) {
      return null;
    }
    
    const timeDiff = switchTime.getTime() - currentTime.getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    let timeRemaining = '';
    if (hours > 0) {
      timeRemaining = `${hours}h ${minutes}m`;
    } else {
      timeRemaining = `${minutes}m`;
    }
    
    return {
      targetPhase: this.phaseSwitch.targetPhase,
      timeRemaining,
      isActive
    };
  }

  /**
   * Gets the container class
   */
  getContainerClass(): string {
    const classes = [`phase-toggle-${this.currentPhase}`];
    
    if (this.compactMode) {
      classes.push('compact');
    }
    
    if (this.disabled) {
      classes.push('disabled');
    }
    
    if (this.hasAutomaticSwitch()) {
      classes.push('has-automatic-switch');
    }
    
    return classes.join(' ');
  }

  /**
   * Gets the phase button class
   */
  getPhaseButtonClass(phase: 'discussion' | 'evaluation'): string {
    const classes = [`phase-button-${phase}`];
    
    if (phase === this.currentPhase) {
      classes.push('active');
    }
    
    if (this.hasPhaseContent(phase)) {
      classes.push('has-content');
    }
    
    return classes.join(' ');
  }

  /**
   * Gets the progress percentage for automatic switch
   */
  getAutomaticSwitchProgress(): number {
    const switchInfo = this.getAutomaticSwitchInfo();
    
    if (!switchInfo || !this.phaseSwitch) {
      return 0;
    }
    
    const currentTime = new Date();
    const startTime = new Date(this.phaseSwitch.createdAt);
    const endTime = new Date(this.phaseSwitch.switchTime);
    
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsedTime = currentTime.getTime() - startTime.getTime();
    
    return Math.min(100, Math.max(0, (elapsedTime / totalDuration) * 100));
  }

  /**
   * Formats time remaining for display
   */
  formatTimeRemaining(timeString: string): string {
    return timeString.replace('h', ' Std ').replace('m', ' Min');
  }

  /**
   * Gets the switch direction icon
   */
  getSwitchDirectionIcon(): string {
    if (!this.phaseSwitch) {
      return 'swap_horiz';
    }
    
    if (this.phaseSwitch.targetPhase === 'evaluation') {
      return 'trending_up';
    } else {
      return 'trending_down';
    }
  }

  /**
   * Gets the urgency level for automatic switch
   */
  getUrgencyLevel(): 'low' | 'medium' | 'high' {
    const progress = this.getAutomaticSwitchProgress();
    
    if (progress >= 80) {
      return 'high';
    } else if (progress >= 50) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Gets help text for the current phase
   */
  getPhaseHelpText(): string {
    const currentInfo = this.getPhaseInfo(this.currentPhase);
    return currentInfo.description;
  }

  /**
   * Checks if phase switching is available
   */
  canSwitchPhases(): boolean {
    return !this.disabled;
  }

  /**
   * Gets accessibility label for toggle
   */
  getToggleAriaLabel(): string {
    const currentInfo = this.getPhaseInfo(this.currentPhase);
    return `Aktuelle Phase: ${currentInfo.title}. Klicken Sie um zwischen Diskussion und Bewertung zu wechseln.`;
  }

  /**
   * Gets status text for current state
   */
  getStatusText(): string {
    if (this.disabled) {
      return 'Phasenwechsel deaktiviert';
    }
    
    const switchInfo = this.getAutomaticSwitchInfo();
    if (switchInfo) {
      const targetInfo = this.getPhaseInfo(switchInfo.targetPhase);
      return `Automatischer Wechsel zu ${targetInfo.title} in ${this.formatTimeRemaining(switchInfo.timeRemaining)}`;
    }
    
    return this.getCurrentPhaseStatus() || 'Manueller Phasenwechsel möglich';
  }

  /**
   * Gets the indicator color for phase status
   */
  getStatusIndicatorColor(): 'success' | 'warning' | 'error' | 'info' {
    if (this.disabled) {
      return 'error';
    }
    
    const urgency = this.getUrgencyLevel();
    
    switch (urgency) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  }
}

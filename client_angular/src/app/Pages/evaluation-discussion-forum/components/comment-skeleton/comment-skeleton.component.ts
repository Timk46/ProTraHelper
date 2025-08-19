import { 
  Component, 
  Input, 
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Subject, interval, takeUntil } from 'rxjs';

/**
 * Comment skeleton loading component for better perceived performance
 * 
 * @description This component provides animated placeholder skeletons while comments are loading.
 * It includes configurable skeleton types, depths, and animation patterns to closely match
 * the final comment structure and improve user experience during loading states.
 */
@Component({
  selector: 'app-comment-skeleton',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './comment-skeleton.component.html',
  styleUrl: './comment-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentSkeletonComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // =============================================================================
  // INPUTS
  // =============================================================================

  /** Number of skeleton comments to display */
  @Input() count: number = 3;

  /** Whether to show reply skeletons */
  @Input() showReplies: boolean = true;

  /** Whether to show vote button skeletons */
  @Input() showVoteButtons: boolean = true;

  /** Whether to show the discussion header skeleton */
  @Input() showHeader: boolean = true;

  /** Animation speed (ms) */
  @Input() animationSpeed: number = 1500;

  /** Skeleton variant */
  @Input() variant: 'default' | 'compact' | 'detailed' = 'default';

  /** Whether to use staggered animation */
  @Input() staggered: boolean = true;

  // =============================================================================
  // COMPONENT STATE
  // =============================================================================

  skeletonItems: SkeletonItem[] = [];
  currentAnimationPhase = 0;

  ngOnInit(): void {
    this.generateSkeletonItems();
    this.startPulseAnimation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =============================================================================
  // SKELETON GENERATION
  // =============================================================================

  private generateSkeletonItems(): void {
    this.skeletonItems = [];

    // Add header skeleton if enabled
    if (this.showHeader) {
      this.skeletonItems.push({
        type: 'header',
        depth: 0,
        hasReplies: false,
        contentLines: 1,
        animationDelay: 0
      });
    }

    // Generate comment skeletons
    for (let i = 0; i < this.count; i++) {
      const hasReplies = this.showReplies && Math.random() > 0.5;
      const contentLines = this.getRandomContentLines();
      
      this.skeletonItems.push({
        type: 'comment',
        depth: 0,
        hasReplies,
        contentLines,
        animationDelay: this.staggered ? i * 200 : 0
      });

      // Add reply skeletons
      if (hasReplies) {
        const replyCount = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < replyCount; j++) {
          this.skeletonItems.push({
            type: 'comment',
            depth: 1,
            hasReplies: false,
            contentLines: this.getRandomContentLines(),
            animationDelay: this.staggered ? (i * 200) + (j * 100) + 300 : 0
          });
        }
      }
    }
  }

  private getRandomContentLines(): number {
    switch (this.variant) {
      case 'compact':
        return Math.floor(Math.random() * 2) + 1; // 1-2 lines
      case 'detailed':
        return Math.floor(Math.random() * 4) + 2; // 2-5 lines
      default:
        return Math.floor(Math.random() * 3) + 1; // 1-3 lines
    }
  }

  private startPulseAnimation(): void {
    interval(this.animationSpeed)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentAnimationPhase = (this.currentAnimationPhase + 1) % 3;
      });
  }

  // =============================================================================
  // TEMPLATE HELPERS
  // =============================================================================

  getSkeletonItemClass(item: SkeletonItem): string {
    const classes = ['skeleton-item', `skeleton-${item.type}`];
    
    if (item.depth > 0) {
      classes.push(`skeleton-depth-${item.depth}`);
    }
    
    classes.push(`skeleton-variant-${this.variant}`);
    
    return classes.join(' ');
  }

  getContentLineClass(index: number): string {
    const classes = ['skeleton-line'];
    
    // Vary line widths for more realistic appearance
    if (index === 0) {
      classes.push('skeleton-line-first');
    } else if (index % 3 === 0) {
      classes.push('skeleton-line-short');
    } else if (index % 2 === 0) {
      classes.push('skeleton-line-medium');
    } else {
      classes.push('skeleton-line-long');
    }
    
    return classes.join(' ');
  }

  getAnimationStyle(item: SkeletonItem): { [key: string]: string } {
    if (!this.staggered) {
      return {};
    }

    return {
      'animation-delay': `${item.animationDelay}ms`,
      'animation-duration': `${this.animationSpeed}ms`
    };
  }

  getIndentationStyle(depth: number): { [key: string]: string } {
    const indentPx = Math.min(depth * 24, 96); // Max 4 levels
    return {
      'margin-left': `${indentPx}px`
    };
  }

  getContentLines(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }

  // =============================================================================
  // RESPONSIVE HELPERS
  // =============================================================================

  getResponsiveSkeletonClass(): string {
    const classes = ['comment-skeleton-container'];
    
    classes.push(`skeleton-count-${Math.min(this.count, 10)}`);
    classes.push(`skeleton-animation-${this.staggered ? 'staggered' : 'synchronized'}`);
    
    return classes.join(' ');
  }

  // =============================================================================
  // TRACK BY FUNCTIONS
  // =============================================================================

  trackBySkeletonItem(index: number, item: SkeletonItem): string {
    return `${item.type}-${item.depth}-${index}`;
  }

  trackByLineIndex(index: number, lineIndex: number): number {
    return lineIndex;
  }
}

// =============================================================================
// INTERFACES
// =============================================================================

interface SkeletonItem {
  type: 'header' | 'comment';
  depth: number;
  hasReplies: boolean;
  contentLines: number;
  animationDelay: number;
}
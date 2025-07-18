import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material Imports
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

// DTOs
import {
  EvaluationCategoryDTO,
  CommentStatsDTO
} from '@dtos';

@Component({
  selector: 'app-category-tabs',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatBadgeModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './category-tabs.component.html',
  styleUrl: './category-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryTabsComponent {
  
  // =============================================================================
  // INPUTS - DATA FROM PARENT (SMART COMPONENT)
  // =============================================================================
  
  @Input() categories: EvaluationCategoryDTO[] = [];
  @Input() activeCategory: string = '';
  @Input() commentStats: CommentStatsDTO | null = null;

  // =============================================================================
  // OUTPUTS - EVENTS TO PARENT (SMART COMPONENT)
  // =============================================================================
  
  @Output() categorySelected = new EventEmitter<string>();

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================
  
  onTabChanged(categoryId: string): void {
    if (categoryId !== this.activeCategory) {
      this.categorySelected.emit(categoryId);
    }
  }

  onTabSelectionChange(event: any): void {
    const selectedCategory = this.categories[event.index];
    if (selectedCategory) {
      this.onTabChanged(selectedCategory.id);
    }
  }

  // =============================================================================
  // TAB MANAGEMENT METHODS
  // =============================================================================
  
  /**
   * Gets the currently selected tab index
   */
  getSelectedTabIndex(): number {
    const activeIndex = this.categories.findIndex(cat => cat.id === this.activeCategory);
    return activeIndex >= 0 ? activeIndex : 0;
  }

  // =============================================================================
  // TEMPLATE HELPER METHODS
  // =============================================================================
  
  /**
   * Gets comment statistics for a specific category
   */
  getCategoryStats(categoryId: string): { 
    availableComments: number; 
    usedComments: number; 
    isLimitReached: boolean;
    indicatorColor: 'success' | 'warn' | 'accent';
    availabilityText: string;
    availabilityIcon: string;
  } {
    if (!this.commentStats) {
      return {
        availableComments: 3,
        usedComments: 0,
        isLimitReached: false,
        indicatorColor: 'success',
        availabilityText: '3/3 verfügbar',
        availabilityIcon: 'add'
      };
    }

    const categoryStats = this.commentStats.categories.find(cat => cat.categoryId === categoryId);
    
    if (!categoryStats) {
      return {
        availableComments: 3,
        usedComments: 0,
        isLimitReached: false,
        indicatorColor: 'success',
        availabilityText: '3/3 verfügbar',
        availabilityIcon: 'add'
      };
    }

    const available = categoryStats.availableComments - categoryStats.usedComments;
    const isLimitReached = available <= 0;
    
    return {
      availableComments: categoryStats.availableComments,
      usedComments: categoryStats.usedComments,
      isLimitReached,
      indicatorColor: isLimitReached ? 'warn' : (available <= 1 ? 'accent' : 'success'),
      availabilityText: `${available}/${categoryStats.availableComments} verfügbar`,
      availabilityIcon: isLimitReached ? 'remove' : 'add'
    };
  }

  /**
   * Gets the availability prefix (+ or -) for display
   */
  getAvailabilityPrefix(categoryId: string): string {
    const stats = this.getCategoryStats(categoryId);
    return stats.isLimitReached ? '-' : '+';
  }

  /**
   * Gets the availability text with proper formatting
   */
  getAvailabilityDisplay(categoryId: string): string {
    const stats = this.getCategoryStats(categoryId);
    const prefix = this.getAvailabilityPrefix(categoryId);
    return `${prefix} ${stats.availabilityText}`;
  }

  /**
   * Gets the CSS class for availability styling
   */
  getAvailabilityClass(categoryId: string): string {
    const stats = this.getCategoryStats(categoryId);
    return `availability-${stats.indicatorColor}`;
  }

  /**
   * Checks if a category is the active one
   */
  isActiveCategory(categoryId: string): boolean {
    return this.activeCategory === categoryId;
  }

  /**
   * Gets tooltip text for a category tab
   */
  getCategoryTooltip(category: EvaluationCategoryDTO): string {
    const stats = this.getCategoryStats(category.id);
    return `${category.displayName}\n${stats.availabilityText}\nKlicken Sie, um zu dieser Kategorie zu wechseln`;
  }

  /**
   * Gets the total used comments for the badge display
   */
  getTotalUsedComments(categoryId: string): number {
    const stats = this.getCategoryStats(categoryId);
    return stats.usedComments;
  }

  /**
   * Checks if the category has any activity
   */
  hasActivity(categoryId: string): boolean {
    const stats = this.getCategoryStats(categoryId);
    return stats.usedComments > 0;
  }

  // =============================================================================
  // TRACK BY FUNCTIONS FOR PERFORMANCE
  // =============================================================================
  
  trackByCategory(index: number, category: EvaluationCategoryDTO): string {
    return category.id;
  }
}

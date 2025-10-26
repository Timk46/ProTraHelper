import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material Imports
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// DTOs
import {
  EvaluationCategoryDTO,
  CommentStatsDTO
} from '@DTOs/index';

@Component({
  selector: 'app-category-tabs',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatBadgeModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule
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
  @Input() activeCategory: number | null = null;
  @Input() commentStats: CommentStatsDTO | null = null;

  // 🔧 NEW: Disable category switching during transitions
  @Input() disabled: boolean = false;

  // =============================================================================
  // OUTPUTS - EVENTS TO PARENT (SMART COMPONENT)
  // =============================================================================

  @Output() categorySelected = new EventEmitter<number>();

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  /**
   * Handles tab change events
   * @param categoryId - The ID of the selected category
   */
  onTabChanged(categoryId: number): void {
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
   * @param categoryId - The ID of the category to get stats for
   * @returns Object containing category statistics
   */
  getCategoryStats(categoryId: number): {
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

    const categoryStats = this.commentStats.categories.find((cat: any) => cat.categoryId === categoryId);

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
   * @param categoryId - The ID of the category
   * @returns String prefix indicating availability status
   */
  getAvailabilityPrefix(categoryId: number): string {
    const stats = this.getCategoryStats(categoryId);
    return stats.isLimitReached ? '-' : '+';
  }

  /**
   * Gets the availability text with proper formatting
   * @param categoryId - The ID of the category
   * @returns Formatted availability text
   */
  getAvailabilityDisplay(categoryId: number): string {
    const stats = this.getCategoryStats(categoryId);
    const prefix = this.getAvailabilityPrefix(categoryId);
    return `${prefix} ${stats.availabilityText}`;
  }

  /**
   * Gets the CSS class for availability styling
   * @param categoryId - The ID of the category
   * @returns CSS class name for styling
   */
  getAvailabilityClass(categoryId: number): string {
    const stats = this.getCategoryStats(categoryId);
    return `availability-${stats.indicatorColor}`;
  }

  /**
   * Checks if a category is the active one
   * @param categoryId - The ID of the category to check
   * @returns True if the category is active, false otherwise
   */
  isActiveCategory(categoryId: number): boolean {
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
   * @param categoryId - The ID of the category
   * @returns Number of used comments
   */
  getTotalUsedComments(categoryId: number): number {
    const stats = this.getCategoryStats(categoryId);
    return stats.usedComments;
  }

  /**
   * Checks if the category has any activity
   * @param categoryId - The ID of the category
   * @returns True if the category has activity, false otherwise
   */
  hasActivity(categoryId: number): boolean {
    const stats = this.getCategoryStats(categoryId);
    return stats.usedComments > 0;
  }

  // =============================================================================
  // TRACK BY FUNCTIONS FOR PERFORMANCE
  // =============================================================================

  /**
   * Track by function for performance optimization
   * @param index - The index of the item
   * @param category - The category object
   * @returns Unique identifier for the category
   */
  trackByCategory(index: number, category: EvaluationCategoryDTO): string {
    return category.id.toString();
  }
}

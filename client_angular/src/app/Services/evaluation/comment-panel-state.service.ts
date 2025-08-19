import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Service to manage the expand/collapse state of comment reply panels
 * 
 * This service provides centralized state management for comment panel visibility,
 * allowing users to expand/collapse reply sections while maintaining state across
 * component re-renders and optionally persisting state in localStorage.
 */
@Injectable({
  providedIn: 'root'
})
export class CommentPanelStateService {
  // Map to track which comment panels are expanded/collapsed
  // Key: commentId, Value: isExpanded (true = expanded, false = collapsed)
  private panelStates = new BehaviorSubject<Map<string, boolean>>(new Map());
  
  // Observable for components to subscribe to panel state changes
  public panelStates$ = this.panelStates.asObservable();
  
  // Local storage key for persisting panel states
  private readonly STORAGE_KEY = 'hefl_comment_panel_states';
  
  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Gets the current expansion state of a comment panel
   * @param commentId The ID of the comment
   * @returns True if expanded, false if collapsed (default: false)
   */
  isPanelExpanded(commentId: string): boolean {
    const currentStates = this.panelStates.value;
    return currentStates.get(commentId) ?? false;
  }

  /**
   * Sets the expansion state of a comment panel
   * @param commentId The ID of the comment
   * @param isExpanded True to expand, false to collapse
   */
  setPanelState(commentId: string, isExpanded: boolean): void {
    const currentStates = new Map(this.panelStates.value);
    currentStates.set(commentId, isExpanded);
    
    this.panelStates.next(currentStates);
    this.saveToLocalStorage();
  }

  /**
   * Toggles the expansion state of a comment panel
   * @param commentId The ID of the comment
   * @returns The new expansion state
   */
  togglePanelState(commentId: string): boolean {
    const currentState = this.isPanelExpanded(commentId);
    const newState = !currentState;
    
    this.setPanelState(commentId, newState);
    return newState;
  }

  /**
   * Expands all comment panels
   */
  expandAllPanels(commentIds: string[]): void {
    const currentStates = new Map(this.panelStates.value);
    
    commentIds.forEach(commentId => {
      currentStates.set(commentId, true);
    });
    
    this.panelStates.next(currentStates);
    this.saveToLocalStorage();
  }

  /**
   * Collapses all comment panels
   */
  collapseAllPanels(commentIds: string[]): void {
    const currentStates = new Map(this.panelStates.value);
    
    commentIds.forEach(commentId => {
      currentStates.set(commentId, false);
    });
    
    this.panelStates.next(currentStates);
    this.saveToLocalStorage();
  }

  /**
   * Gets an observable for a specific comment panel state
   * @param commentId The ID of the comment
   * @returns Observable<boolean> that emits true when expanded, false when collapsed
   */
  getPanelState(commentId: string): Observable<boolean> {
    return new Observable(subscriber => {
      // Subscribe to panel states and emit only changes for this specific comment
      const subscription = this.panelStates$.subscribe(statesMap => {
        const isExpanded = statesMap.get(commentId) ?? false;
        subscriber.next(isExpanded);
      });

      // Return cleanup function
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Clears all panel states (useful for cleanup or reset)
   */
  clearAllStates(): void {
    this.panelStates.next(new Map());
    this.clearLocalStorage();
  }

  /**
   * Gets the count of currently expanded panels
   * @returns Number of expanded panels
   */
  getExpandedPanelCount(): number {
    const currentStates = this.panelStates.value;
    let count = 0;
    
    currentStates.forEach(isExpanded => {
      if (isExpanded) count++;
    });
    
    return count;
  }

  /**
   * Checks if any panels are currently expanded
   * @returns True if at least one panel is expanded
   */
  hasExpandedPanels(): boolean {
    return this.getExpandedPanelCount() > 0;
  }

  /**
   * Gets the current panel states as a Map
   * @returns Current Map of panel states for immediate synchronous access
   */
  getCurrentPanelStates(): Map<string, boolean> {
    return new Map(this.panelStates.value);
  }

  // =============================================================================
  // PRIVATE METHODS - LOCAL STORAGE PERSISTENCE
  // =============================================================================

  /**
   * Loads panel states from localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const stateObject = JSON.parse(stored);
        // Convert object back to Map
        const stateMap = new Map<string, boolean>(Object.entries(stateObject));
        this.panelStates.next(stateMap);
        
        console.log('📂 Loaded comment panel states from localStorage:', stateMap.size, 'states');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load comment panel states from localStorage:', error);
      // Continue with empty state if localStorage fails
    }
  }

  /**
   * Saves current panel states to localStorage
   */
  private saveToLocalStorage(): void {
    try {
      const currentStates = this.panelStates.value;
      // Convert Map to object for JSON serialization
      const stateObject = Object.fromEntries(currentStates);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateObject));
      
      console.log('💾 Saved comment panel states to localStorage:', currentStates.size, 'states');
    } catch (error) {
      console.warn('⚠️ Failed to save comment panel states to localStorage:', error);
      // Continue without persistence if localStorage fails
    }
  }

  /**
   * Clears panel states from localStorage
   */
  private clearLocalStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Cleared comment panel states from localStorage');
    } catch (error) {
      console.warn('⚠️ Failed to clear comment panel states from localStorage:', error);
    }
  }
}
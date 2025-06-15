import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NavigationType = 'graph' | 'mobile' | 'highlight';

@Injectable({
  providedIn: 'root'
})
export class NavigationPreferenceService {
  private readonly STORAGE_KEY = 'nav_preference';
  private preferenceSubject = new BehaviorSubject<NavigationType>(this.getStoredPreference());

  /**
   * Returns the current navigation preference as an Observable
   */
  get preference$(): Observable<NavigationType> {
    return this.preferenceSubject.asObservable();
  }

  /**
   * Returns the current navigation preference value
   */
  get currentPreference(): NavigationType {
    return this.preferenceSubject.value;
  }

  /**
   * Retrieves the stored navigation preference from localStorage
   * Defaults to 'graph' if no preference is stored
   */
  private getStoredPreference(): NavigationType {
    const storedPreference = localStorage.getItem(this.STORAGE_KEY) as NavigationType;
    return storedPreference || 'graph';
  }

  /**
   * Sets and stores the user's navigation preference
   * @param preference The navigation preference to set ('graph' or 'mobile')
   */
  setNavigationPreference(preference: NavigationType): void {
    localStorage.setItem(this.STORAGE_KEY, preference);
    this.preferenceSubject.next(preference);
  }

  /**
   * Toggles between navigation types in sequence: graph -> mobile -> highlight
   */
  toggleNavigationPreference(): void {
    const newPreference: NavigationType =
      this.currentPreference === 'graph' ? 'mobile' :
      this.currentPreference === 'mobile' ? 'highlight' : 'graph';
    this.setNavigationPreference(newPreference);
  }
}

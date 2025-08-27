import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BehaviorSubject, of } from 'rxjs';
import { ModuleSettingsService } from '../module-settings/module-settings.service';
import { catchError, map } from 'rxjs/operators';

export type NavigationType = 'graph' | 'mobile' | 'highlight';

interface NavigatorSetting {
  enabled: NavigationType[];
}

@Injectable({
  providedIn: 'root',
})
export class NavigationPreferenceService {
  private readonly STORAGE_KEY = 'nav_preference';
  private readonly preferenceSubject = new BehaviorSubject<NavigationType>(
    this.getStoredPreference(),
  );
  private enabledNavigationTypes: NavigationType[] = ['graph', 'mobile', 'highlight'];

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
   * Toggles between enabled navigation types in sequence
   */
  toggleNavigationPreference(): void {
    // Get the index of the current preference in the enabled types
    const currentIndex = this.enabledNavigationTypes.indexOf(this.currentPreference);

    // If current preference is not in enabled types or it's the last one, go to the first enabled type
    // Otherwise, go to the next enabled type
    const nextIndex =
      currentIndex === -1 || currentIndex === this.enabledNavigationTypes.length - 1
        ? 0
        : currentIndex + 1;

    // Set the new preference
    const newPreference = this.enabledNavigationTypes[nextIndex];
    this.setNavigationPreference(newPreference);
  }

  /**
   * Loads the enabled navigation types from the server
   * @param moduleId The ID of the module
   */
  loadEnabledNavigationTypes(moduleId: number): Observable<NavigationType[]> {
    console.log('loadEnabledNavigationTypes', moduleId);
    return this.moduleSettings.getSetting<NavigatorSetting>(moduleId, 'enabled_navigators').pipe(
      map(setting => {
        if (setting?.enabled && setting.enabled.length > 0) {
          this.enabledNavigationTypes = setting.enabled;

          // If current preference is not in enabled types, switch to the first enabled type
          if (!this.enabledNavigationTypes.includes(this.currentPreference)) {
            this.setNavigationPreference(this.enabledNavigationTypes[0]);
          }

          return this.enabledNavigationTypes;
        }
        return ['graph', 'mobile', 'highlight'] as NavigationType[];
      }),
      catchError(() => {
        // Default to all navigation types if there's an error
        this.enabledNavigationTypes = ['graph', 'mobile', 'highlight'] as NavigationType[];
        return of(this.enabledNavigationTypes);
      }),
    );
  }

  constructor(private readonly moduleSettings: ModuleSettingsService) {
    // Load enabled navigation types for module ID 1 (default module)
    //this.loadEnabledNavigationTypes(1).subscribe();
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ModuleSettingsService {
  private readonly apiUrl = environment.server;

  constructor(private readonly http: HttpClient) {}

  /**
   * Gets the settings for a specific module and key
   */
  getSetting<T>(moduleId: number, key: string): Observable<T> {
    return this.http
      .get<{ value: string }>(`${this.apiUrl}/module-settings/${moduleId}/${key}`)
      .pipe(map(response => JSON.parse(response.value) as T));
  }

  /**
   * Updates settings for a specific module and key
   */
  updateSetting<T>(moduleId: number, key: string, value: T): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/module-settings/${moduleId}/${key}`, {
      value: JSON.stringify(value),
    });
  }
}

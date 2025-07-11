import { Injectable } from '@angular/core';
import type { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ContentManagementService {
  private readonly apiUrl = `${environment.server}/admin/content`;

  constructor(private readonly http: HttpClient) {}

  exportContent(): Observable<any> {
    return this.http.get(`${this.apiUrl}/export`, {
      responseType: 'json',
    });
  }

  importContent(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/import`, data);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  GroupReviewGateStatusDTO,
  CreateGroupReviewSessionsDTO,
  CreateGroupReviewSessionsResultDTO,
} from '@DTOs/index';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GroupReviewSessionService {
  private readonly apiUrl = `${environment.server}/lecturers/group-review-sessions`;

  constructor(private http: HttpClient) {}

  getGroupReviewGateStatuses(): Observable<GroupReviewGateStatusDTO[]> {
    return this.http.get<GroupReviewGateStatusDTO[]>(this.apiUrl);
  }

  createSessions(
    dto: CreateGroupReviewSessionsDTO,
  ): Observable<CreateGroupReviewSessionsResultDTO> {
    return this.http.post<CreateGroupReviewSessionsResultDTO>(this.apiUrl, dto);
  }
}

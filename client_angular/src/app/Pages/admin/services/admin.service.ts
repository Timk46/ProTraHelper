import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  UserListItemDTO,
  UserDetailsDTO,
  SubjectDTO,
  QuestionTypeProgressDTO,
  DailyProgressDTO,
  AllUsersDailyProgressDTO,
} from '@DTOs/index';
nexport { QuestionTypeProgressDTO as QuestionTypeProgress, DailyProgressDTO as DailyProgress, UserDetailsDTO as UserDetails } from '@DTOs/index';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly apiUrl = environment.server + '/admin';

  constructor(private readonly http: HttpClient) {}

  getAllUsers(): Observable<UserListItemDTO[]> {
    return this.http.get<UserListItemDTO[]>(`${this.apiUrl}/users`);
  }

  getUserTotalProgress(userId: number): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/users/${userId}/progress`);
  }

  getUserProgressByQuestionType(userId: number): Observable<QuestionTypeProgressDTO> {
    return this.http.get<QuestionTypeProgressDTO>(
      `${this.apiUrl}/users/${userId}/progress-by-question-type`,
    );
  }

  getUserDailyProgress(userId: number): Observable<DailyProgressDTO[]> {
    return this.http.get<DailyProgressDTO[]>(`${this.apiUrl}/users/${userId}/daily-progress`);
  }

  getAllUsersDailyProgress(): Observable<AllUsersDailyProgressDTO[]> {
    return this.http.get<AllUsersDailyProgressDTO[]>(`${this.apiUrl}/all-users-daily-progress`);
  }

  getUserDetails(userId: number): Observable<UserDetailsDTO> {
    return this.http.get<UserDetailsDTO>(`${this.apiUrl}/users/${userId}/details`);
  }

  toggleRegisteredForSL(userId: number, subjectId: number, value: boolean): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/users/${userId}/subjects/${subjectId}`, {
      registeredForSL: value,
    });
  }

  getSubjects(): Observable<SubjectDTO[]> {
    return this.http.get<SubjectDTO[]>(`${this.apiUrl}/subjects`);
  }

  processEmailsForSubject(emails: string[], subjectId: number): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/process-emails`, { emails, subjectId });
  }
}

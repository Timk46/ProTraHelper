import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface UserListItem {
  id: number;
  email: string;
  kiFeedbackCount: number;
  chatBotMessageCount: number;
  totalProgress: number;
  subjects: { id: number; name: string; registeredForSL: boolean }[];
}

interface Subject {
  id: number;
  name: string;
}

export interface QuestionTypeProgress {
  [key: string]: {
    total: number;
    completed: number;
  };
}

export interface DailyProgress {
  date: string;
  count: number;
}

export interface AllUsersDailyProgress {
  date: string;
  type: string;
  count: number;
}

export interface UserDetails {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  globalRole: string;
  createdAt: string;
  totalProgress: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly apiUrl = environment.server + '/admin';

  constructor(private readonly http: HttpClient) {}

  getAllUsers(): Observable<UserListItem[]> {
    return this.http.get<UserListItem[]>(`${this.apiUrl}/users`);
  }

  getUserTotalProgress(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/progress`);
  }

  getUserProgressByQuestionType(userId: number): Observable<QuestionTypeProgress> {
    return this.http.get<QuestionTypeProgress>(
      `${this.apiUrl}/users/${userId}/progress-by-question-type`,
    );
  }

  getUserDailyProgress(userId: number): Observable<DailyProgress[]> {
    return this.http.get<DailyProgress[]>(`${this.apiUrl}/users/${userId}/daily-progress`);
  }

  getAllUsersDailyProgress(): Observable<AllUsersDailyProgress[]> {
    return this.http.get<AllUsersDailyProgress[]>(`${this.apiUrl}/all-users-daily-progress`);
  }

  getUserDetails(userId: number): Observable<UserDetails> {
    return this.http.get<UserDetails>(`${this.apiUrl}/users/${userId}/details`);
  }

  toggleRegisteredForSL(userId: number, subjectId: number, value: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${userId}/subjects/${subjectId}`, {
      registeredForSL: value,
    });
  }

  getSubjects(): Observable<Subject[]> {
    return this.http.get<Subject[]>(`${this.apiUrl}/subjects`);
  }

  processEmailsForSubject(emails: string[], subjectId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/process-emails`, { emails, subjectId });
  }
}

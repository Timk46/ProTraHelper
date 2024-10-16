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

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.server + '/admin';

  constructor(private http: HttpClient) { }

  getAllUsers(): Observable<UserListItem[]> {
    return this.http.get<UserListItem[]>(`${this.apiUrl}/users`);
  }

  getUserTotalProgress(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/progress`);
  }

  toggleRegisteredForSL(userId: number, subjectId: number, value: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${userId}/subjects/${subjectId}`, { registeredForSL: value });
  }

  getSubjects(): Observable<Subject[]> {
    return this.http.get<Subject[]>(`${this.apiUrl}/subjects`);
  }

  processEmailsForSubject(emails: string[], subjectId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/process-emails`, { emails, subjectId });
  }
}

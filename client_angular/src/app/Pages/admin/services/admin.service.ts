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

interface UserProgress {
  totalProgress: number;
  subjects: { name: string; progress: number }[];
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

  getUserTotalProgress(userId: number): Observable<UserProgress> {
    return this.http.get<UserProgress>(`${this.apiUrl}/users/${userId}/progress`);
  }

  toggleRegisteredForSL(userId: number, subjectId: number, value: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${userId}/subjects/${subjectId}`, { registeredForSL: value });
  }
}

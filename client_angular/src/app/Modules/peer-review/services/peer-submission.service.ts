import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PeerSubmissionDTO, CreatePeerSubmissionDTO, UpdatePeerSubmissionDTO } from '../../../../../../shared/dtos';
@Injectable({
  providedIn: 'root',
})
export class PeerSubmissionService {
  private readonly baseUrl = '/api/peer-review/submissions';

  constructor(private http: HttpClient) {}

  createSubmission(submission: CreatePeerSubmissionDTO): Observable<PeerSubmissionDTO> {
    return this.http.post<PeerSubmissionDTO>(this.baseUrl, submission);
  }

  getSubmission(id: string): Observable<PeerSubmissionDTO> {
    return this.http.get<PeerSubmissionDTO>(`${this.baseUrl}/${id}`);
  }

  getSubmissionsBySession(sessionId: string): Observable<PeerSubmissionDTO[]> {
    return this.http.get<PeerSubmissionDTO[]>(`${this.baseUrl}?sessionId=${sessionId}`);
  }

  getUserSubmissions(): Observable<PeerSubmissionDTO[]> {
    return this.http.get<PeerSubmissionDTO[]>(`${this.baseUrl}?mySubmissions=true`);
  }

  updateSubmission(id: string, submission: UpdatePeerSubmissionDTO): Observable<PeerSubmissionDTO> {
    return this.http.put<PeerSubmissionDTO>(`${this.baseUrl}/${id}`, submission);
  }

  deleteSubmission(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Helper method to get file icon based on type
  getFileIcon(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
      case 'docx':
        return 'description';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'zip':
      case 'rar':
        return 'archive';
      default:
        return 'attachment';
    }
  }

  // Helper method to format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper method to get submission status
  getSubmissionStatus(submission: PeerSubmissionDTO): {
    text: string;
    color: string;
    icon: string;
  } {
    if (submission.reviewCount === 0) {
      return {
        text: 'Keine Bewertungen',
        color: 'warn',
        icon: 'schedule',
      };
    }

    if (submission.averageRating !== undefined && submission.averageRating !== null) {
      const rating = submission.averageRating;
      if (rating >= 4) {
        return {
          text: `Sehr gut (${rating.toFixed(1)})`,
          color: 'primary',
          icon: 'star',
        };
      } else if (rating >= 3) {
        return {
          text: `Gut (${rating.toFixed(1)})`,
          color: 'accent',
          icon: 'star_half',
        };
      } else {
        return {
          text: `Verbesserungsbedarf (${rating.toFixed(1)})`,
          color: 'warn',
          icon: 'star_border',
        };
      }
    }

    return {
      text: 'Bewertung ausstehend',
      color: 'primary',
      icon: 'schedule',
    };
  }
}

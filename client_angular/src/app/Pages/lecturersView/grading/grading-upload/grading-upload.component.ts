import { Component, Input, OnInit } from '@angular/core';
import { GradingService } from '../services/grading.service';
import { UserUploadAnswerListItemDTO } from '@DTOs/userAnswer.dto';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-grading-upload',
  templateUrl: './grading-upload.component.html',
  styleUrls: ['./grading-upload.component.scss']
})
export class GradingUploadComponent implements OnInit {
  @Input() questionId!: number;
  isLoading = true;
  error: string | null = null;

  userAnswers: UserUploadAnswerListItemDTO[] = [];
  groupedAnswers: { [key: string]: UserUploadAnswerListItemDTO[] } = {};
  groupKeys: string[] = [];
  expandedGroups: { [key: string]: boolean } = {};

  constructor(
    private gradingService: GradingService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    if (this.questionId) {
      this.getUserAnswers(this.questionId);
    }
  }

  getUserAnswers(questionId: number): void {
    this.isLoading = true;
    this.error = null;
    this.gradingService.getAllUserUploadAnswers(questionId).subscribe({
      next: (data) => {
        this.userAnswers = data;
        this.groupedAnswers = {};
        this.groupKeys = [];
        this.expandedGroups = {};
        // Group by conceptTitle + questionTitle
        for (const answer of data) {
          const key = `${answer.conceptTitle}|||${answer.questionTitle}`;
          if (!this.groupedAnswers[key]) {
            this.groupedAnswers[key] = [];
          }
          this.groupedAnswers[key].push(answer);
        }
        // Sort each group by uploadDate descending (newest first)
        for (const key in this.groupedAnswers) {
          this.groupedAnswers[key].sort((a, b) => {
            const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
            const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
            return dateB - dateA;
          });
        }
        this.groupKeys = Object.keys(this.groupedAnswers);
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load user answers';
        this.isLoading = false;
      }
    });
  }

  toggleGroup(key: string): void {
    this.expandedGroups[key] = !this.expandedGroups[key];
  }

  downloadFile(fileUniqueIdentifier: string): void {
    this.gradingService.downloadFile(fileUniqueIdentifier).subscribe({
      next: ({ blob, filename }) => {
        // Fallback: falls filename leer ist, nimm die UUID
        let safeFilename = filename && filename.trim() ? filename.trim() : fileUniqueIdentifier;
        // Browser-sichere Zeichen entfernen
        safeFilename = safeFilename.replace(/[\\/:*?"<>|]/g, '_');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Failed to download file', err);
        this.snackBar.open('Datei konnte nicht heruntergeladen werden. Eventuell ist sie nicht mehr vorhanden.', 'Schließen', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}

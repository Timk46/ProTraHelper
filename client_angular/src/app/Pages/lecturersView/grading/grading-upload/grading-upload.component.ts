import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { GradingService } from '../services/grading.service';
import { UserUploadAnswerListItemDTO } from '@DTOs/userAnswer.dto';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { QuestionDTO } from '@DTOs/index';

@Component({
  selector: 'app-grading-upload',
  templateUrl: './grading-upload.component.html',
  styleUrls: ['./grading-upload.component.scss']
})
export class GradingUploadComponent implements OnInit, OnChanges {
  // Sortier- und Anzeige-Logik
  sortColumn: string = 'latestUploadDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  sortedGroupKeys: string[] = [];

  @Input() questionId: number | undefined;
  isLoading = true;
  error: string | null = null;

  question: QuestionDTO | null = null; 
  userAnswers: UserUploadAnswerListItemDTO[] = [];
  groupedAnswers: { [key: string]: UserUploadAnswerListItemDTO[] } = {};
  groupKeys: string[] = [];
  expandedGroups: { [key: string]: boolean } = {};

  constructor(
    private route: ActivatedRoute,
    private questionDataService: QuestionDataService,
    private gradingService: GradingService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('questionId');
      if (id) {
        this.questionId = +id;
        this.fetchQuestionData(+id);
      }
    });
    this.getUserAnswers(this.questionId || -1);
  }

  
  ngOnChanges(): void {
    this.updateSortedGroupKeys();
  }
  
  fetchQuestionData(questionId: number): void {
    this.isLoading = true;
    this.error = null;
    this.questionDataService.getQuestionData(questionId).subscribe({
      next: (data) => {
        this.question = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load question data.';
        this.isLoading = false;
      }
    });
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = column === 'latestUploadDate' ? 'desc' : 'asc';
    }
    this.updateSortedGroupKeys();
  }

  updateSortedGroupKeys(): void {
    if (!this.groupKeys || !this.groupedAnswers) {
      this.sortedGroupKeys = [];
      return;
    }
    this.sortedGroupKeys = [...this.groupKeys].sort((a, b) => {
      const groupA = this.groupedAnswers[a];
      const groupB = this.groupedAnswers[b];
      if (!groupA || !groupB) return 0;
      let valA: any;
      let valB: any;
      switch (this.sortColumn) {
        case 'conceptTitle':
          valA = groupA[0]?.conceptTitle?.toLocaleLowerCase() || '';
          valB = groupB[0]?.conceptTitle?.toLocaleLowerCase() || '';
          break;
        case 'questionTitle':
          valA = groupA[0]?.questionTitle?.toLocaleLowerCase() || '';
          valB = groupB[0]?.questionTitle?.toLocaleLowerCase() || '';
          break;
        case 'userMail':
          valA = groupA[0]?.userMail?.toLocaleLowerCase() || '';
          valB = groupB[0]?.userMail?.toLocaleLowerCase() || '';
          break;
        case 'fileName':
          valA = groupA[0]?.fileName?.toLocaleLowerCase() || '';
          valB = groupB[0]?.fileName?.toLocaleLowerCase() || '';
          break;
        case 'latestUploadDate':
        default:
          valA = this.getLatestUploadDate(a)?.getTime() || 0;
          valB = this.getLatestUploadDate(b)?.getTime() || 0;
      }
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getLatestUploadDate(key: string): Date | null {
    const group = this.groupedAnswers[key];
    if (!group || group.length === 0) return null;
    return group[0].uploadDate ? new Date(group[0].uploadDate) : null;
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
        // Group by conceptTitle + questionTitle + userMail
        for (const answer of data) {
          const key = `${answer.conceptTitle}|||${answer.questionTitle}|||${answer.userMail}`;
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
        this.updateSortedGroupKeys();
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
        let safeFilename = filename && filename.trim() ? filename.trim() : fileUniqueIdentifier;
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

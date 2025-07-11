import type { OnInit, OnDestroy, ComponentRef } from '@angular/core';
import { Component, ViewChild, ViewContainerRef } from '@angular/core';
import type { ActivatedRoute, Router } from '@angular/router';
import type { Observable } from 'rxjs';
import { finalize, forkJoin, Subject, takeUntil } from 'rxjs';
import type { QuestionDataService } from 'src/app/Services/question/question-data.service';
import type { QuestionDTO } from '@DTOs/index';
import { questionType } from '@DTOs/index';
import type { MatSnackBar } from '@angular/material/snack-bar';
import type { McTaskComponent } from '../contentView/contentElement/mcTask/mcTask.component';
import type { FreeTextTaskComponent } from '../contentView/contentElement/free-text-task/free-text-task.component';
import type { FillinTaskNewComponent } from '../contentView/contentElement/fill-in-task-new/fill-in-task-new.component';
import type { TaskViewData } from '@DTOs/index';
import type { MatDialogRef } from '@angular/material/dialog';
import { MatDialogConfig } from '@angular/material/dialog';
import type { EditUploadComponent } from '../lecturersView/edit-upload/edit-upload.component';

@Component({
  selector: 'app-dynamic-question',
  templateUrl: './dynamic-question.component.html',
  styleUrls: ['./dynamic-question.component.scss'],
})
export class DynamicQuestionComponent implements OnInit, OnDestroy {
  @ViewChild('dynamicComponentContainer', {
    read: ViewContainerRef,
    static: true,
  })
  container!: ViewContainerRef;

  private readonly componentRef!: ComponentRef<any>;
  private readonly destroy$ = new Subject<void>();

  isLoading: boolean = true;
  private question: QuestionDTO | undefined;
  private progressData: { progress: number } | undefined;
  private contentId: { contentNodeId: number; contentElementId: number } | undefined;
  private conceptId!: number;
  private questionId!: number;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly questionService: QuestionDataService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    let currentRoute: ActivatedRoute | null = this.route;
    while (currentRoute) {
      const conceptIdParam = currentRoute.snapshot.paramMap.get('conceptId');
      if (conceptIdParam) {
        this.conceptId = Number(conceptIdParam);
        break;
      }
      currentRoute = currentRoute.parent;
    }

    // Get 'questionId' from the current route
    const questionIdParam = this.route.snapshot.paramMap.get('questionId');
    this.questionId = Number(questionIdParam);

    if (isNaN(this.questionId) || isNaN(this.conceptId)) {
      this.snackBar.open('Ungültige Frage-ID oder Konzept-ID.', 'Schließen', { duration: 3000 });
      return;
    }

    forkJoin({
      question: this.questionService.getQuestionData(this.questionId),
      progressData: this.questionService.getQuestionProgress(this.questionId) as Observable<{
        progress: number;
      }>,
      contentId: this.questionService.getContentIds(this.questionId) as Observable<{
        contentNodeId: number;
        contentElementId: number;
      }>,
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: ({ question, progressData, contentId }) => {
          if (!question || !progressData || !contentId) {
            this.snackBar.open('Unvollständige Daten empfangen.', 'Schließen', { duration: 3000 });
            return;
          }

          this.question = question;
          this.progressData = progressData;
          this.contentId = contentId;

          const taskViewData: TaskViewData = {
            contentNodeId: contentId.contentNodeId,
            contentElementId: contentId.contentElementId,
            id: question.id,
            name: question.name,
            type: question.type,
            progress: progressData.progress ?? 0,
            description: question.description,
            level: question.level ?? 1,
          };
          this.loadTaskComponent(question.type, taskViewData);
        },
        error: error => {
          console.error('Error loading question data:', {
            error,
            questionId: this.questionId,
            conceptId: this.conceptId,
            currentState: {
              question: this.question,
              progressData: this.progressData,
              contentId: this.contentId,
            },
          });

          this.snackBar.open('Fehler beim Laden der Frage.', 'Schließen', { duration: 3000 });
        },
      });
  }

  /**
   * @description Loads the appropriate task component based on the question type.
   * @param {string} type - The type of the question.
   * @param {TaskViewData} taskViewData - The data for the task component.
   */
  loadTaskComponent(type: string, taskViewData: TaskViewData): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      taskViewData: taskViewData,
      conceptId: this.conceptId,
      questionId: this.questionId,
    };
    dialogConfig.width = 'auto';
    dialogConfig.maxHeight = '95vh';

    let dialogRef:
      | MatDialogRef<
          EditUploadComponent | McTaskComponent | FreeTextTaskComponent | FillinTaskNewComponent
        >
      | undefined;

    // Open the appropriate dialog based on the task type
    switch (type) {
      case questionType.SINGLECHOICE:
      case questionType.MULTIPLECHOICE:
      case questionType.FILLIN:
        dialogRef = this.questionService.openDialog(type, dialogConfig);
        break;
      case questionType.FREETEXT:
        dialogRef = this.questionService.openDialog(type, dialogConfig);
        break;
      case questionType.CODE:
        this.router.navigate([`/tutor-kai/code/${taskViewData.id}`], {
          queryParams: {
            concept: this.conceptId,
          },
        });
        break;
      case questionType.GRAPH:
        this.router.navigate([`/graphtask/${taskViewData.id}`], {
          queryParams: {
            concept: this.conceptId,
          },
        });
        return;
      default:
        console.warn(`No dialog defined for task type: ${type}`);
        return;
    }
    if (dialogRef) {
      dialogRef.afterClosed().subscribe(() => {
        this.router.navigate([`/dashboard/concept/${this.conceptId}`]);
      });
    }
  }

  /**
   * @description Unsubscribes from the destroy$ observable and destroys the component reference.
   * @returns {void}
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.componentRef) {
      this.componentRef.destroy();
    }
  }
}

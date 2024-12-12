import { Component, OnInit, OnDestroy, ViewChild, ViewContainerRef, ComponentRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, Observable, Subject, takeUntil } from 'rxjs';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { QuestionDTO, questionType } from '@DTOs/index';
import { MatSnackBar } from '@angular/material/snack-bar';
import { McTaskComponent } from '../contentView/contentElement/mcTask/mcTask.component';
import { FreeTextTaskComponent } from '../contentView/contentElement/free-text-task/free-text-task.component';
import { FillinTaskNewComponent } from '../contentView/contentElement/fill-in-task-new/fill-in-task-new.component';
import { TaskViewData } from '@DTOs/index';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatDialogConfig } from '@angular/material/dialog';


@Component({
  selector: 'app-dynamic-question',
  template: ` <ng-template #dynamicComponentContainer></ng-template> `,
  styles: [],
})
export class DynamicQuestionComponent implements OnInit, OnDestroy {
  @ViewChild('dynamicComponentContainer', {
    read: ViewContainerRef,
    static: true,
  })
  container!: ViewContainerRef;

  private componentRef!: ComponentRef<any>;
  private destroy$ = new Subject<void>();

  isLoading: boolean = true;
  private question: QuestionDTO | undefined;
  private progressData: { progress: number } | undefined;
  private contentId: { contentNodeId: number; contentElementId: number } | undefined;
  private conceptId!: number;
  private questionId!: number;

  constructor(
    private route: ActivatedRoute,
    private questionService: QuestionDataService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {
    console.log("constructor of dynamic question component");
  }

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

    console.log("conceptId: ", this.conceptId);
    console.log("questionId: ", this.questionId);

    if (isNaN(this.questionId) || isNaN(this.conceptId)) {
      this.snackBar.open('Ungültige Frage-ID oder Konzept-ID.', 'Schließen', { duration: 3000 });
      return;
    }

    forkJoin({
      question: this.questionService.getQuestionData(this.questionId) as Observable<QuestionDTO>,
      progressData: this.questionService.getQuestionProgress(this.questionId) as Observable<{ progress: number }>,
      contentId: this.questionService.getContentIds(this.questionId) as Observable<{ contentNodeId: number; contentElementId: number }>
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoading = false;
      })
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
          level: question.level ?? 1
        };
        this.loadTaskComponent(question.type, taskViewData);

      },
      error: (error) => {
        console.error('Error loading question data:', {
          error,
          questionId: this.questionId,
          conceptId: this.conceptId,
          currentState: {
            question: this.question,
            progressData: this.progressData,
            contentId: this.contentId
          }
        });

        this.snackBar.open('Fehler beim Laden der Frage.', 'Schließen', { duration: 3000 });
      }
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
      questionId: this.questionId
    };
    dialogConfig.width = 'auto';
    dialogConfig.maxHeight = '95vh';

    let dialogRef: MatDialogRef<McTaskComponent | FreeTextTaskComponent | FillinTaskNewComponent> | undefined;

    // Open the appropriate dialog based on the task type
    switch (type) {
      case questionType.SINGLECHOICE:
      case questionType.MULTIPLECHOICE:
        dialogRef = this.dialog.open(McTaskComponent, dialogConfig);
        break;
      case questionType.FREETEXT:
        dialogRef = this.dialog.open(FreeTextTaskComponent, dialogConfig);
        break;
      case questionType.CODE:
        this.router.navigate([`/tutor-kai/code/${taskViewData.id}`]);
        break;
      case questionType.GRAPH:
        this.router.navigate([`/graphtask/${taskViewData.id}`]);
        return;
      case questionType.FILLIN:
        dialogRef = this.dialog.open(FillinTaskNewComponent, {...dialogConfig, width: '50vw'});
        break;
    }
    if (dialogRef) {
      dialogRef.afterClosed().subscribe(() => {
        this.router.navigate([`/dashboard/conceptOverview/${this.conceptId}`]);
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

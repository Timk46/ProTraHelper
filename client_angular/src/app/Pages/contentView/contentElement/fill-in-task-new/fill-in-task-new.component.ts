import { Component, ComponentFactory, ComponentFactoryResolver, EventEmitter, Inject, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { taskViewDTO } from '@DTOs/content.dto';
import { FillinQuestionDTO } from '@DTOs/fillInText.dto';
import { UserAnswerDataDTO, userAnswerFeedbackDTO, UserFillinAnswer } from '@DTOs/userAnswer.dto';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { DynamicBlankComponent } from './dynamic-blank/dynamic-blank.component';
import { Subject, takeUntil } from 'rxjs';
import { FillinQuestionType } from '@DTOs/fillInType.enum';
import { CdkDrag, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-fill-in-task-new',
  templateUrl: './fill-in-task-new.component.html',
  styleUrls: ['./fill-in-task-new.component.scss']
})
export class FillinTaskNewComponent {
  @Output() submitClicked = new EventEmitter<any>();

  private destroy$ = new Subject<void>();
  protected fillinTypes = FillinQuestionType;
  protected processedContent: SafeHtml | undefined;
  protected taskViewData: taskViewDTO;
  protected contentElementId: number;
  protected fillinQuestionData: FillinQuestionDTO | undefined;
  protected isLoading: boolean = true;
  protected isSending: boolean = false;
  protected isCorrect: boolean = false;
  protected submitDisabled: boolean = false;
  protected gapValues: UserFillinAnswer[] = [];
  protected gapIds: string[] = [];
  protected possibleAnswers: string[] = [];
  protected feedbackText: userAnswerFeedbackDTO | undefined;
  protected feedbackColor: string = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private sanitizer: DomSanitizer,
    private questionDataService: QuestionDataService,
    private viewContainerRef: ViewContainerRef,
  ) {
    this.taskViewData = data.taskViewData;
    this.contentElementId = data.taskViewData.contentElementId || -1;
  }

  ngOnInit() {
    this.questionDataService.getFillinTask(this.taskViewData.id).subscribe((data) => {
      this.fillinQuestionData = data;
      this.processContent();
      this.isLoading = false;
    });
  }

  /**
   * Processes the fill-in question content by parsing the HTML, replacing gaps with dynamic blank components,
   * and sanitizing the resulting HTML. After rendering the component, it replaces the gap placeholders.
   *
   * @returns {void}
   */
  processContent() {
    if (!this.fillinQuestionData) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.fillinQuestionData.content, 'text/html');
    const gaps = doc.querySelectorAll('.generated-blank');
    this.gapIds = Array.from(gaps).map(gap => "gap_" + gap.getAttribute('data-position') || '');
    if (this.fillinQuestionData.taskType === FillinQuestionType.FillinDropdown) {
      this.possibleAnswers = Array.from(new Set(this.fillinQuestionData.blanks.map(blank => blank.blankContent || '<missingStr>')));
    } else {
      this.possibleAnswers = this.fillinQuestionData.blanks.map(blank => blank.blankContent || '<missingStr>');
    }

    gaps.forEach((gap, index) => {
      const id = gap.getAttribute('data-position');
      const placeholder = `<app-dynamic-blank id="gap_${id}"></app-dynamic-blank>`;
      gap.outerHTML = placeholder;
    });

    this.processedContent = this.sanitizer.bypassSecurityTrustHtml(doc.body.innerHTML);

    // After the component has been rendered
    setTimeout(() => {
      this.replaceGapPlaceholders();
    });
  }

  /**
   * Replaces placeholders in the view with dynamic blank components and sets up their initial state and event listeners.
   * Updates the gap values based on user input and maintains the state of each gap element.
   */
  replaceGapPlaceholders() {
    const gapElements = this.viewContainerRef.element.nativeElement.querySelectorAll('app-dynamic-blank');

    gapElements.forEach((element: HTMLElement) => {
      if (element.getAttribute('id') === null || !this.fillinQuestionData || !this.fillinQuestionData.taskType) return;

      const componentRef = this.viewContainerRef.createComponent(DynamicBlankComponent);
      componentRef.instance.id = element.getAttribute('id');
      componentRef.instance.blankMode = this.fillinQuestionData.taskType || FillinQuestionType.FillinText;
      componentRef.instance.otherBlankIds = this.gapIds;
      if (this.fillinQuestionData.taskType === FillinQuestionType.FillinDropdown
      ) {
        componentRef.instance.blankOptions = [...this.possibleAnswers]
      }

      this.gapValues.push({ position: element.getAttribute('id')!.slice(4), answer: '' }); // remove 'gap_' from id and add to gapValues

      componentRef.instance.valueChange.subscribe((value: UserFillinAnswer) => {
        const existingIndex = this.gapValues.findIndex(v => v.position === value.position);
        if (existingIndex !== -1) {
          // Replace the existing value
          this.gapValues[existingIndex] = value;
        } else {
          // Add the new value if it doesn't exist
          this.gapValues.push(value);
        }
      });
      element.parentNode!.replaceChild(componentRef.location.nativeElement, element);
    });
  }

  /**
   * Updates the feedback color based on the score and total score of the fill-in question data.
   */
  private updateFeedbackColor(): void {
    if (!this.feedbackText || !this.fillinQuestionData) return;
    const score = this.feedbackText.score;
    const totalScore = this.fillinQuestionData.question.score!;
    this.feedbackColor = score === totalScore ? '#a3be8c' :
                         score >= totalScore * 0.5 ? '#ffa500' : '#ff0000';
  }

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.previousContainer.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data,
                        event.container.data,
                        event.previousIndex,
                        event.currentIndex);
    }
  }

  onLog(){
    console.log(this.gapValues);
  }

  /**
   * Handles the submission of the fill-in task by creating a user answer and updating the task view data.
   * Disables the submit button during the process and provides feedback based on the response.
   */
  onSubmitTask(): void {
    if (!this.fillinQuestionData) return;

    this.isSending = true;

    const userAnswerData: UserAnswerDataDTO = {
      id: -1,
      questionId: this.fillinQuestionData.question.id,
      contentElementId: this.contentElementId,
      userId: -1,
      userFillinTextAnswer: this.gapValues,
    };

    this.questionDataService.createUserAnswer(userAnswerData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.feedbackText = data;
          this.submitClicked.emit(data.progress);
          this.taskViewData.progress = Math.max(this.taskViewData.progress, data.progress);
          this.submitDisabled = true;
          this.isCorrect = this.fillinQuestionData!.question.score === this.feedbackText.score;
          this.updateFeedbackColor();
          this.isSending = false;
          setTimeout(() => {
            this.submitDisabled = false;
          }, 500);
        },
        error: (error) => {
          console.error('Error submitting answer:', error);
          this.isSending = false;
          setTimeout(() => {
            this.submitDisabled = false;
          }, 500);

        }
      });

  }

  onRetry() {

  }

  onClose() {

  }

}

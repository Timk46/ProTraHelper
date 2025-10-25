import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import {
  ContentElementDTO,
  contentElementType,
  gradingContent,
  questionType,
  taskViewDTO,
} from '@DTOs/index';
import { ProgressService } from 'src/app/Services/progress/progress.service';
import { FillinTaskNewComponent } from '../../contentView/contentElement/fill-in-task-new/fill-in-task-new.component';
import { FreeTextTaskComponent } from '../../contentView/contentElement/free-text-task/free-text-task.component';
import { McTaskComponent } from '../../contentView/contentElement/mcTask/mcTask.component';
import { McSliderTaskComponent } from '../../contentView/contentElement/mcSliderTask/mc-slider-task.component';
import { EditUploadComponent } from '../../lecturersView/edit-upload/edit-upload.component';
import { Router } from '@angular/router';
import { UserService } from 'src/app/Services/auth/user.service';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { ContentLinkerService } from 'src/app/Services/contentLinker/content-linker.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UploadTaskComponent } from '../../contentView/contentElement/upload-task/upload-task.component';
import { GroupReviewGateDialogComponent } from '../../contentView/contentElement/group-review-gate-dialog/group-review-gate-dialog.component';
import { TaskCollectionComponent } from '../../contentView/contentElement/task-collection/task-collection.component';
import { LoggerService } from 'src/app/Services/logger/logger.service';

@Component({
  selector: 'app-content-list-item',
  templateUrl: './content-list-item.component.html',
  styleUrls: ['./content-list-item.component.scss'],
})
export class ContentListItemComponent implements OnInit {
  @Input() contentElementData: ContentElementDTO = {
    id: -1,
    type: contentElementType.TEXT,
    contentViewId: -1,
    positionInSpecificContentView: -1,
    question: {
      id: -1,
      type: 'task',
      level: -1,
      progress: -1,
      name: '',
      description: '',
    },
    isVisible: true,
  };

  @Input() contentNodeId!: number; // ContentNodeId für Positionsänderung
  @Input() allContentElements: ContentElementDTO[] = []; // Alle ContentElements für MCSlider-Gruppierung

  @Output() scoreUpdated: EventEmitter<ContentElementDTO> = new EventEmitter<ContentElementDTO>();
  @Output() fetchContentsForConcept = new EventEmitter<void>();
  @Output() contentElementDeleted = new EventEmitter<number>();

  protected rippleEnabled: boolean = true;

  protected isAdmin: boolean = false;
  protected isGradingContent: boolean = false;
  protected editModeActive: boolean = false;
  protected editModeButtonsClickable: boolean = false;

  // Scoped logger for better traceability
  private readonly log = this.logger.scope('ContentListItemComponent');

  constructor(
    private readonly progressService: ProgressService,
    private readonly dialog: MatDialog,
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly confirmService: ConfirmationService,
    private readonly contentLinkerService: ContentLinkerService,
    private readonly questionDataService: QuestionDataService,
    private readonly snackBar: MatSnackBar,
    private readonly logger: LoggerService,
  ) {
    this.isAdmin = this.userService.getRole() === 'ADMIN';
  }

  ngOnInit() {
    this.userService.hasEditModeActive$.subscribe(hasEditModeActive => {
      this.editModeActive = hasEditModeActive;
    });
    this.isGradingContent =
      this.contentElementData.type === contentElementType.QUESTION &&
      gradingContent.includes(this.contentElementData.question?.type as questionType);
  }

  /**
   * Generates a more readable name for a given question type.
   *
   * @param type - The type of the question.
   * @returns A string representing the more readable name of the question type.
   */
  getQuestionTypeReadable(type: string | undefined): string {
    switch (type) {
      case questionType.MULTIPLECHOICE:
        return 'Multiple Choice';
      case questionType.SINGLECHOICE:
        return 'Single Choice';
      case questionType.MCSLIDER:
        // Use group size if available (from the grouping logic)
        if (this.contentElementData.mcSliderGroupSize) {
          return this.contentElementData.mcSliderGroupSize > 1
            ? `MC Slider Quiz (${this.contentElementData.mcSliderGroupSize} Fragen)`
            : 'MC Slider Quiz';
        }

        // Fallback to old logic for compatibility
        const mcSliderCount = this.getAllMCSliderQuestions().length;
        return mcSliderCount > 1 ? `MC Slider Quiz (${mcSliderCount} Fragen)` : 'MC Slider Quiz';
      case questionType.FREETEXT:
        return 'Freitext';
      case questionType.FILLIN:
        return 'Lückentext';
      case questionType.CODE:
        return 'Programmieraufgabe';
      case questionType.GRAPH:
        return 'Graphaufgabe';
      case questionType.UML:
        return 'UML-Aufgabe';
      case questionType.CODEGAME:
        return 'Codegame';
      case questionType.UPLOAD:
        return 'Upload-Aufgabe';
      case questionType.GROUP_REVIEW_GATE:
        return 'Abgabenbewertung';
      case questionType.COLLECTION:
        return 'Aufgabensammlung';
      default:
        return 'Aufgabe';
    }
  }

  /**
   * Returns the corresponding icon name for a given question type.
   *
   * @param type - The type of the question. It can be one of the following:
   * @returns The name of the icon corresponding to the given question type.
   */
  getQuestionTypeIcon(type: string | undefined): string {
    switch (type) {
      case questionType.MULTIPLECHOICE:
        return 'list';
      case questionType.SINGLECHOICE:
        return 'radio_button_checked';
      case questionType.MCSLIDER:
        return 'view_carousel';
      case questionType.FREETEXT:
        return 'text_fields';
      case questionType.FILLIN:
        return 'short_text';
      case questionType.CODE:
        return 'code';
      case questionType.GRAPH:
        return 'device_hub';
      case questionType.UML:
        return 'account_tree';
      case questionType.CODEGAME:
        return 'videogame_asset';
      case questionType.UPLOAD:
        return 'cloud_upload';
      case questionType.GROUP_REVIEW_GATE:
        return 'group_work';
      case questionType.COLLECTION:
        return 'dynamic_feed';
      default:
        return 'help';
    }
  }

  /**
   * Handles the click event on a task item.
   *
   * This method performs the following actions:
   * - Logs the click event.
   * - Checks if the task has a question associated with it.
   * - Configures and opens a dialog based on the type of the question.
   * - Navigates to different routes for specific question types.
   * - Subscribes to dialog submission events to update the task's progress.
   *
   * @returns {void}
   */
  onTaskClick() {
    console.log('Task clicked');
    if (!this.contentElementData.question) return;
    const question: taskViewDTO = this.contentElementData.question;
    // Create dialog configuration
    const dialogConfig = new MatDialogConfig();
    
    dialogConfig.width = 'auto';
    dialogConfig.maxHeight = '95vh';

    let dialogRef:
      | MatDialogRef<
          | McTaskComponent
          | FreeTextTaskComponent
          | FillinTaskNewComponent
          | UploadTaskComponent
          | GroupReviewGateDialogComponent
          | McSliderTaskComponent
          | TaskCollectionComponent
        >
      | undefined;

    // Open the appropriate dialog based on the task type
    switch (question.type) {
      case questionType.SINGLECHOICE:
      case questionType.MULTIPLECHOICE:
        dialogRef = this.dialog.open(McTaskComponent, dialogConfig);
        break;
      case questionType.MCSLIDER:
        // Always load all MCSlider questions in the same content (grouped behavior)
        const allMCSliderQuestions = this.getAllMCSliderQuestions();
        dialogConfig.data = {
          ...dialogConfig.data,
          questions: allMCSliderQuestions.length > 0 ? allMCSliderQuestions : [question],
        };
        // Configure optimized dialog for MCSlider with minimal whitespace
        dialogConfig.width = '90vw';
        dialogConfig.maxWidth = '900px';
        dialogConfig.height = '85vh';
        dialogConfig.maxHeight = '85vh';
        dialogConfig.panelClass = 'mcslider-dialog-panel';
        dialogRef = this.dialog.open(McSliderTaskComponent, dialogConfig);
        break;
      case questionType.FREETEXT:
        dialogRef = this.dialog.open(FreeTextTaskComponent, dialogConfig);
        break;
      case questionType.CODE:
        // Navigate to coding question component
        this.router.navigate([this.getRouterLink('CodingQuestion', question.id)]);
        break;
      case questionType.GRAPH:
        // Navigate to graph question component
        this.router.navigate([`/graphtask/${question.id}`]);
        return;
      case questionType.FILLIN:
        dialogRef = this.dialog.open(FillinTaskNewComponent, { ...dialogConfig, width: '50vw' });
        break;
      case questionType.UML:
        this.router.navigate([this.getRouterLink('UML', question.id)]);
        break;
      case questionType.CODEGAME:
        // Navigate to coding question component
        this.router.navigate([this.getRouterLink('CodeGame', question.id)]);
        break;
      case questionType.UPLOAD:
        dialogRef = this.dialog.open(UploadTaskComponent, { ...dialogConfig, width: '70vw' });
        break;
      case questionType.GROUP_REVIEW_GATE:
        console.log('Opening Group Review Gate Dialog with data:', question);
        dialogRef = this.dialog.open(GroupReviewGateDialogComponent, {
          ...dialogConfig,
          width: '70vw',
        });
        break;
      case questionType.COLLECTION:
        dialogRef = this.dialog.open(TaskCollectionComponent, dialogConfig);
    }

    // Handle dialog submission if a dialog was opened
    if (dialogRef) {
      //Provide the data over inputs instead of dialog data to allow embedding
      dialogRef.componentInstance.taskViewData = {
        contentElementId: this.contentElementData.id,
        contentNodeId: this.contentNodeId,
        name: this.contentElementData.title || 'Namenlose Aufgabe',
        ...question,
      };

      // Subscribe to dialog events
      const submitSubscription = dialogRef.componentInstance.submitClicked.subscribe(
        (score: number) => {
          this.log.debug('Score update received', {
            currentScore: question.progress,
            submittedScore: score,
            questionId: question.id,
          });

          // update the score if higher
          if (score > question.progress) {
            // the tasks score is taken from dataSource
            question.progress = score;
            this.scoreUpdated.emit(this.contentElementData);

            if (score === 100) {
              this.log.info('Task completed successfully for the first time', {
                questionId: question.id,
                questionName: question.name,
              });
              this.progressService.answerSubmitted();
            }
          }
        },
      );

      // Clean up subscription when dialog closes
      dialogRef.afterClosed().subscribe(() => {
        submitSubscription.unsubscribe();
      });
    }
  }

  onTaskVisibilityToggle() {
    if (this.editModeActive && this.contentElementData.contentViewId) {
      console.log('Toggling content view visibility');
      this.contentLinkerService
        .updateContentViewVisibility(
          this.contentElementData.contentViewId,
          !this.contentElementData.isVisible,
        )
        .subscribe(success => {
          if (success) {
            console.log('Content view visibility updated');
            this.contentElementData.isVisible = !this.contentElementData.isVisible;
          }
        });
    }
  }

  onTaskGrading() {
    if (!this.contentElementData.question || !this.editModeButtonsClickable) return;
    const question: taskViewDTO = this.contentElementData.question;
    console.log('onTaskGrading', question);
    // Navigate to grading overview
    this.router.navigate(['/lecturer/grading/uploads', question.id]);
  }

  /**
   * Handles the task editing process based on the type of question.
   * If the question or edit mode buttons are not clickable, the function returns early.
   * Depending on the type of the question, it navigates to the corresponding edit page.
   *
   * @returns {void}
   */
  onTaskEdit() {
    if (!this.contentElementData.question || !this.editModeButtonsClickable) return;
    const question: taskViewDTO = this.contentElementData.question;
    switch (question.type) {
      case questionType.SINGLECHOICE:
      case questionType.MULTIPLECHOICE:
      case questionType.MCSLIDER:
        this.router.navigate(['/editchoice/', question.id]);
        break;
      case questionType.FREETEXT:
        this.router.navigate(['/editfreetext/', question.id]);
        break;
      case questionType.FILLIN:
        console.log('FILLIN');
        this.router.navigate(['/editfillin/', question.id]);
        break;
      case questionType.CODE:
        this.router.navigate(['/editcoding/', question.id]);
        break;
      case questionType.GRAPH:
        this.router.navigate(['/editgraph/', question.id]);
        break;
      case questionType.UML:
        this.router.navigate(['/edituml/', question.id]);
        break;
      case questionType.CODEGAME:
        this.router.navigate(['/editcodegame/', question.id]);
        break;
      case questionType.UPLOAD:
        console.log('The question', this.contentElementData.question);
        // Open upload edit dialog directly
        const dialogRef = this.dialog.open(EditUploadComponent, {
          width: '600px',
          data: {
            questionId: question.id,
            detailedQuestion: this.contentElementData.question,
            mode: 'edit',
          },
          disableClose: true,
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            console.log('Upload question updated:', result);
            // Optionally refresh the content or show success message
            this.snackBar.open('Upload-Aufgabe aktualisiert', 'OK', { duration: 3000 });
          }
        });
        break;
      case questionType.GROUP_REVIEW_GATE:
        this.router.navigate(['/editgroupreviewgate/', question.id]);
        break;
      case questionType.COLLECTION:
        this.router.navigate(['/editcollection/', question.id, this.contentNodeId]);
        break;
    }
  }

  /**
   * Handles the deletion of a task by unlinking the content element after user confirmation.
   *
   * @returns {void}
   */
  onTaskDelete() {
    if (!this.contentElementData.question || !this.editModeButtonsClickable) return;
    this.confirmService.confirm({
      title: 'Verknüpfung aufheben?',
      message: 'Die Verknüpfung zur Frage wird aufgehoben. Die Frage bleibt bestehen. Fortfahren?',
      acceptLabel: 'Aufheben',
      declineLabel: 'Abbrechen',
      swapButtons: true,
      swapColors: true,
      accept: () => {
        console.log('deleting');
        this.contentLinkerService
          .unlinkContentElement(this.contentElementData.id)
          .subscribe(success => {
            console.log('unlink success: ', success);
            this.snackBar.open('Verknüpfung aufgehoben', 'OK', { duration: 3000 });
            this.progressService.questionLinkDeleted();
            this.contentElementDeleted.emit(this.contentElementData.id);
          });
      },
      decline: () => {
        console.log('aborted');
      },
    });
  }

  /**
   * Event handler for mouse enter event on the hover menu.
   * Disables the ripple effect and enables edit mode buttons after a delay.
   *
   * @param event - The mouse event triggered by entering the hover menu.
   */
  onHoverMenuMouseEnter(event: MouseEvent) {
    this.rippleEnabled = false;
    setTimeout(() => {
      this.editModeButtonsClickable = true;
    }, 200);
  }

  /**
   * Generates a router link based on the provided question type and index.
   *
   * @param type - The type of the question. Can be 'CodingQuestion' or 'UML'.
   * @param index - The index of the question.
   * @returns The router link as a string.
   * @throws Will throw an error if the question type is unknown.
   */
  getRouterLink(type: string, index: number): string {
    switch (type) {
      case 'CodingQuestion':
        return `/tutor-kai/code/${index}`;
      case 'UML':
        return `/umlearn/task-workspace/${index}`;
      case 'CodeGame':
        return `/code-game/${index}`;
      default:
        throw new Error('Unknown question type');
    }
  }

  /**
   * Generates an array with a specified number of elements.
   *
   * @param num - The number of elements in the array.
   * @returns An array with the specified number of elements.
   */
  getLevels(num: number): number[] {
    return new Array(num);
  }

  /**
   * Verschiebt das Item nach oben (Position verringern)
   */
  onMoveUp() {
    if (!this.editModeButtonsClickable) return;
    if (this.contentNodeId == null || this.contentElementData.positionInSpecificContentView == null)
      return;
    this.contentLinkerService
      .updateContentNodePosition(
        this.contentNodeId,
        this.contentElementData.positionInSpecificContentView - 1,
      )
      .subscribe(() => {
        this.fetchContentsForConcept.emit();
      });
  }

  /**
   * Verschiebt das Item nach unten (Position erhöhen)
   */
  onMoveDown() {
    if (!this.editModeButtonsClickable) return;
    if (this.contentNodeId == null || this.contentElementData.positionInSpecificContentView == null)
      return;
    this.contentLinkerService
      .updateContentNodePosition(
        this.contentNodeId,
        this.contentElementData.positionInSpecificContentView + 1,
      )
      .subscribe(() => {
        this.fetchContentsForConcept.emit();
      });
  }

  /**
   * Holt alle MCSlider-Fragen aus der aktuellen Inhaltsliste für die gleiche Gruppe
   * Sortiert nach Position um korrekte Reihenfolge sicherzustellen
   */
  private getAllMCSliderQuestions(): any[] {
    // If we have a group key, filter by the same group
    if (this.contentElementData.mcSliderGroupKey) {
      const targetGroupKey = this.contentElementData.mcSliderGroupKey;

      return this.allContentElements
        .filter(element => {
          if (element.question?.type !== questionType.MCSLIDER) return false;
          if (!element.question?.name) return false;

          // Determine group key for this element
          let elementGroupKey = 'MCSlider: Komplettquiz'; // Default: alle gehen ins Komplettquiz
          if (element.question.name.includes('Strukturmechanik')) {
            elementGroupKey = 'MCSlider: Strukturmechanik';
          }
          // Alle anderen MCSlider-Fragen (Standard, Geografie, Mathematik, etc.) gehen ins Komplettquiz

          return elementGroupKey === targetGroupKey;
        })
        .sort((a, b) => {
          // Sortiere nach positionInSpecificContentView oder ID als Fallback
          const posA = a.positionInSpecificContentView || a.id || 0;
          const posB = b.positionInSpecificContentView || b.id || 0;
          return posA - posB;
        })
        .map(element => element.question)
        .filter(question => question != null);
    }

    // Fallback to old logic for compatibility
    return this.allContentElements
      .filter(element => element.question?.type === questionType.MCSLIDER)
      .sort((a, b) => {
        // Sortiere nach positionInSpecificContentView oder ID als Fallback
        const posA = a.positionInSpecificContentView || a.id || 0;
        const posB = b.positionInSpecificContentView || b.id || 0;
        return posA - posB;
      })
      .map(element => element.question)
      .filter(question => question != null);
  }

  /**
   * Generates the title for MCSlider groups, showing individual title or group summary
   */
  getMCSliderGroupTitle(): string {
    if (this.contentElementData.question?.type === questionType.MCSLIDER) {
      // Use the group key if available (from the grouping logic)
      if (this.contentElementData.mcSliderGroupKey) {
        return this.contentElementData.mcSliderGroupKey;
      }

      // Fallback to old logic for compatibility
      const mcSliderCount = this.getAllMCSliderQuestions().length;
      if (mcSliderCount > 1) {
        return `MCSlider: Komplettquiz`;
      }
    }
    return this.contentElementData.question?.name || '';
  }
}

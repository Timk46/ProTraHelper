import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { ContentDTO, ContentElementDTO, contentElementType, gradingContent, questionType, taskViewDTO } from '@DTOs/index';
import { takeUntil } from 'rxjs';
import { ProgressService } from 'src/app/Services/progress/progress.service';
import { FillinTaskNewComponent } from '../../contentView/contentElement/fill-in-task-new/fill-in-task-new.component';
import { FreeTextTaskComponent } from '../../contentView/contentElement/free-text-task/free-text-task.component';
import { McTaskComponent } from '../../contentView/contentElement/mcTask/mcTask.component';
import { EditUploadComponent } from '../../lecturersView/edit-upload/edit-upload.component';
import { Router } from '@angular/router';
import { UserService } from 'src/app/Services/auth/user.service';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { ContentLinkerService } from 'src/app/Services/contentLinker/content-linker.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UploadTaskComponent } from '../../contentView/contentElement/upload-task/upload-task.component';

@Component({
  selector: 'app-content-list-item',
  templateUrl: './content-list-item.component.html',
  styleUrls: ['./content-list-item.component.scss']
})
export class ContentListItemComponent {

  @Input() contentElementData: ContentElementDTO = {
    id : -1,
    type: contentElementType.TEXT,
    positionInSpecificContentView: -1,
    question: {
      id: -1,
      type: 'task',
      level: -1,
      progress: -1,
      name: '',
      description: '',
    }
  };

  @Input() contentNodeId!: number; // ContentNodeId für Positionsänderung

  @Output() scoreUpdated: EventEmitter<ContentElementDTO> = new EventEmitter<ContentElementDTO>();
  @Output() fetchContentsForConcept = new EventEmitter<void>();
  @Output() contentElementDeleted = new EventEmitter<number>();

  protected rippleEnabled: boolean = true;

  protected isAdmin: boolean = false;
  protected isGradingContent: boolean = false;
  protected editModeActive: boolean = false;
  protected editModeButtonsClickable: boolean = false;


  constructor(
    private progressService: ProgressService,
    private dialog: MatDialog,
    private router: Router,
    private userService: UserService,
    private confirmService: ConfirmationService,
    private contentLinkerService: ContentLinkerService,
    private questionDataService: QuestionDataService,
    private snackBar: MatSnackBar
  ) {
    this.isAdmin = this.userService.getRole() === 'ADMIN';
    this.isGradingContent = this.contentElementData.type === contentElementType.QUESTION && gradingContent.includes(this.contentElementData.question?.type as questionType);
  }

  ngOnInit() {
    this.userService.hasEditModeActive$.subscribe((hasEditModeActive) => {
      this.editModeActive = hasEditModeActive;
    });
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
    console.log("Task clicked");
    if (!this.contentElementData.question) return;
    const question: taskViewDTO = this.contentElementData.question;
    // Create dialog configuration
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      taskViewData: {
        contentElementId: this.contentElementData.id,
        ...question,
      },
    };
    dialogConfig.width = 'auto';
    dialogConfig.maxHeight = '95vh';

    let dialogRef: MatDialogRef<McTaskComponent | FreeTextTaskComponent | FillinTaskNewComponent | UploadTaskComponent> | undefined;

    // Open the appropriate dialog based on the task type
    switch (question.type) {
      case questionType.SINGLECHOICE:
      case questionType.MULTIPLECHOICE:
        dialogRef = this.dialog.open(McTaskComponent, dialogConfig);
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
        dialogRef = this.dialog.open(FillinTaskNewComponent, {...dialogConfig, width: '50vw'});
        break;
      case questionType.UML:
        this.router.navigate([this.getRouterLink("UML", question.id)]);
        break;
      case questionType.CODEGAME:
        // Navigate to coding question component
        this.router.navigate([this.getRouterLink('CodeGame', question.id)]);
        break;
      case questionType.UPLOAD:
        dialogRef = this.dialog.open(UploadTaskComponent, {...dialogConfig, width: '70vw'});
        break;
    }

    // Handle dialog submission if a dialog was opened
    if (dialogRef) {
      //const prevScore = selectedTask.progress;

      // Subscribe to dialog events and manage with takeUntil
      dialogRef.componentInstance.submitClicked
        .pipe(takeUntil(dialogRef.afterClosed()))
        .subscribe((score: number) => {
          console.log("current score:", question.progress, "submitted score:", score);

          // update the score if higher
          if (score > question.progress) {
            // the tasks score is taken from dataSource
            question.progress = score;
            this.scoreUpdated.emit(this.contentElementData);

            if (score === 100) {
              console.log("Aufgabe wurde zum ersten Mal erfolgreich gelöst.");
              this.progressService.answerSubmitted();
            }
          }
        });
    }
  }

  onTaskGrading(){
    if (!this.contentElementData.question || !this.editModeButtonsClickable) return;
    const question: taskViewDTO = this.contentElementData.question;
    console.log("onTaskGrading", question);
    // Navigate to grading overview
    this.router.navigate(['/grading/', question.id]);
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
        this.router.navigate(['/editchoice/', question.id]);
        break;
      case questionType.FREETEXT:
        this.router.navigate(['/editfreetext/', question.id]);
        break;
      case questionType.FILLIN:
        console.log("FILLIN");
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
        console.log("The question", this.contentElementData.question);
        // Open upload edit dialog directly
        const dialogRef = this.dialog.open(EditUploadComponent, {
          width: '600px',
          data: {
            questionId: question.id,
            detailedQuestion: this.contentElementData.question,
            mode: 'edit'
          },
          disableClose: true
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            console.log('Upload question updated:', result);
            // Optionally refresh the content or show success message
            this.snackBar.open('Upload-Aufgabe aktualisiert', 'OK', { duration: 3000 });
          }
        });
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
      title: "Verknüpfung aufheben?",
      message: "Die Verknüpfung zur Frage wird aufgehoben. Die Frage bleibt bestehen. Fortfahren?",
      acceptLabel: "Aufheben",
      declineLabel: "Abbrechen",
      swapButtons: true,
      swapColors: true,
      accept: () => {
        console.log("deleting");
        this.contentLinkerService.unlinkContentElement(this.contentElementData.id).subscribe(
          (success) => {
            console.log("unlink success: ", success);
            this.snackBar.open("Verknüpfung aufgehoben", "OK", { duration: 3000 });
            this.progressService.questionLinkDeleted();
            this.contentElementDeleted.emit(this.contentElementData.id);
          }
        );
      }, decline: () => {
        console.log("aborted");
      }
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
  getLevels(num: number): Array<number> {
    return new Array(num);
  }

  /**
   * Verschiebt das Item nach oben (Position verringern)
   */
  onMoveUp() {
    if (!this.editModeButtonsClickable) return;
    if (this.contentNodeId == null || this.contentElementData.positionInSpecificContentView == null) return;
    this.contentLinkerService.updateContentNodePosition(this.contentNodeId, this.contentElementData.positionInSpecificContentView - 1).subscribe(() => {
      this.fetchContentsForConcept.emit();
    });
  }

  /**
   * Verschiebt das Item nach unten (Position erhöhen)
   */
  onMoveDown() {
    if (!this.editModeButtonsClickable) return;
    if (this.contentNodeId == null || this.contentElementData.positionInSpecificContentView == null) return;
    this.contentLinkerService.updateContentNodePosition(this.contentNodeId, this.contentElementData.positionInSpecificContentView + 1).subscribe(() => {
      this.fetchContentsForConcept.emit();
    });
  }

}

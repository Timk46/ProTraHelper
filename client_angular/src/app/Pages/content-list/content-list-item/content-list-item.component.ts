import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { ContentDTO, ContentElementDTO, contentElementType, questionType, taskViewDTO } from '@DTOs/index';
import { takeUntil } from 'rxjs';
import { ProgressService } from 'src/app/Services/progress/progress.service';
import { FillinTaskNewComponent } from '../../contentView/contentElement/fill-in-task-new/fill-in-task-new.component';
import { FreeTextTaskComponent } from '../../contentView/contentElement/free-text-task/free-text-task.component';
import { McTaskComponent } from '../../contentView/contentElement/mcTask/mcTask.component';
import { Router } from '@angular/router';
import { UserService } from 'src/app/Services/auth/user.service';

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

  @Output() scoreUpdated: EventEmitter<ContentElementDTO> = new EventEmitter<ContentElementDTO>();

  protected rippleEnabled: boolean = true;

  protected isAdmin: boolean = false;
  protected editModeActive: boolean = false;


  constructor(
    private progressService: ProgressService,
    private dialog: MatDialog,
    private router: Router,
    private userService: UserService
  ) {
    this.isAdmin = this.userService.getRole() === 'ADMIN';
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
      default:
        return 'help';
    }
  }

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

    let dialogRef: MatDialogRef<McTaskComponent | FreeTextTaskComponent | FillinTaskNewComponent> | undefined;

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
        this.router.navigate([this.getRouterLink(question.id)]);
        break;
      case questionType.GRAPH:
        // Navigate to graph question component
        this.router.navigate([`/graphtask/${question.id}`]);
        return;
      case questionType.FILLIN:
        dialogRef = this.dialog.open(FillinTaskNewComponent, {...dialogConfig, width: '50vw'});
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

  /**
   * Generates a router link string based on the provided index.
   *
   * @param {number} index - The index to be included in the router link.
   * @returns {string} The generated router link string.
   */
  getRouterLink(index: number): string {
    return `/tutor-kai/code/${index}`;
  }

}

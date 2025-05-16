  import { Component } from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { TaskMockDataService } from 'src/app/Services/task-mock-data.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MultipleFreeTextTaskComponent } from 'src/app/Pages/contentView/contentElement/multiple-free-text-task/multiple-free-text-task.component';

/**
 * Dialog component for selecting task types
 * Allows users to choose between Multiple Choice, Fill-in, and Free Text tasks
 */
@Component({
  selector: 'app-task-selection-dialog',
  templateUrl: './task-selection-dialog.component.html',
  styleUrls: ['./task-selection-dialog.component.scss']
})
export class TaskSelectionDialogComponent {
  /**
   * Constructor initializing required services
   */
  constructor(
    public dialogRef: MatDialogRef<TaskSelectionDialogComponent>,
    private dialog: MatDialog,
    private mockDataService: TaskMockDataService,
    private questionService: QuestionDataService
  ) { }

  /**
   * Handles the selection of a task type
   * Opens the corresponding task component with mock data
   *
   * @param type - The selected task type ('mc', 'fill-in', 'free-text', or 'multiple-free-text')
   */
  selectTaskType(type: 'mc' | 'fill-in' | 'free-text' | 'multiple-free-text'): void {
    // Close the selection dialog first
    this.dialogRef.close();

    // Open the appropriate task dialog based on selection
    switch(type) {
      case 'mc':
        const mcData = this.mockDataService.getMcTaskMockData();
        // Der injizierte QuestionDataService ist eigentlich der MockQuestionDataService
        this.questionService.openDialog('MultipleChoice', {
          width: '80%',
          maxWidth: '800px',
          data: { taskViewData: mcData }
        });
        break;

      case 'fill-in':
        const fillInData = this.mockDataService.getFillInTaskMockData();
        // Der injizierte QuestionDataService ist eigentlich der MockQuestionDataService
        this.questionService.openDialog('FillIn', {
          width: '80%',
          maxWidth: '800px',
          data: { taskViewData: fillInData }
        });
        break;

      case 'free-text':
        const freeTextData = this.mockDataService.getFreeTextTaskMockData();
        // Der injizierte QuestionDataService ist eigentlich der MockQuestionDataService
        this.questionService.openDialog('FreeText', {
          width: '80%',
          maxWidth: '800px',
          data: { taskViewData: freeTextData }
        });
        break;

      case 'multiple-free-text':
        const multipleFreetextData = this.mockDataService.getFreeTextTaskMockData();
        // Öffnen der neuen Multi-Freitext-Komponente direkt mit MatDialog
        this.dialog.open(MultipleFreeTextTaskComponent, {
          width: '90%',
          maxWidth: '1000px',
          height: '90%',
          data: { taskViewData: multipleFreetextData }
        });
        break;
    }
  }
}

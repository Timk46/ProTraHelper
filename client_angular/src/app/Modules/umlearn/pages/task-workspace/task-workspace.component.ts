import { Component, OnDestroy, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { editorDataDTO, EditorModel, taskAttemptDataDTO, taskWorkspaceDataDTO } from '@DTOs/index';
import { DatabaseTaskCommunicationService } from '@UMLearnServices/database-task-communication.service';
import { NotificationService } from '@UMLearnServices/notification.service';
import { TaskDescriptionPopupComponent } from '../task-creation/task-description-popup/task-description-popup.component';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
  selector: 'app-task-workspace',
  templateUrl: './task-workspace.component.html',
  styleUrls: ['./task-workspace.component.scss']
})
export class TaskWorkspaceComponent implements OnDestroy {
  private subscriptions: Subscription[] = []; // Array to store subscriptions to unsubscribe later

  @ViewChild('tinyMCE') tinyMCE: any; // Reference to the TinyMCE editor

  isSubmitted: boolean = false;
  helpVisible: boolean = false;
  reachedPoints: number = 0;
  feedbackText: string = "";

  tinyMceConfig: any = {
    readonly: false,
    plugins: 'autoresize lists table image code codesample',
    toolbar: 'undo redo | bold italic underline | forecolor backcolor',
    min_height: window.innerHeight * 0.65,
    max_height: window.innerHeight * 0.65,
    autoresize: true,
    resize: false,
  };

  init: boolean = false; // Boolean to check if the task data is loaded

  sharedVariable: string = "Parent Initial Wert";

  taskAttemptData: taskAttemptDataDTO = {
    taskId: -1,
    userAnswerId: -1,
    attemptData: {
      nodes: [],
      edges: [],
    },
  };

  taskWorkspaceData: taskWorkspaceDataDTO = {
    id: -1,
    title: 'Dummy Task Title',
    description: 'Dummy Task Description',
    taskSettings: {
      allowedNodeTypes: [],
      allowedEdgeTypes: [],
      editorModel: EditorModel.CLASSDIAGRAM,
    },
    maxPoints: -1,
  };



  constructor(
    private dtcs: DatabaseTaskCommunicationService,
    private route: ActivatedRoute,
    private notification: NotificationService,
    private router: Router,
    public dialog: MatDialog,
    )
    {
      const routeParamsSubscription = this.route.params.subscribe(params => {
        this.taskAttemptData.taskId = params['taskId'];
        const getTaskWorkspaceDataSubscription = dtcs.getTaskWorkspaceData(this.taskAttemptData.taskId).subscribe((data: taskWorkspaceDataDTO) => {
          this.taskWorkspaceData = data;
          this.init = true;
        });
        this.subscriptions.push(getTaskWorkspaceDataSubscription);

        const getTaskAttemptDataSubscription = dtcs.getTaskAttemptData(this.taskAttemptData.taskId).subscribe((data: taskAttemptDataDTO) => {
          notification.info("Daten werden geladen...");
          this.taskAttemptData = data;
          notification.success("Daten wurden erfolgreich geladen!");
        });
        this.subscriptions.push(getTaskAttemptDataSubscription);
      });
      this.subscriptions.push(routeParamsSubscription);
    }

  onGenerateFeedback() {
    this.dtcs.generateUmlFeedback(this.taskAttemptData.taskId).subscribe((data: string) => {
      this.feedbackText = data;
    });
  }

  /**
   * Navigates to the course page for a student when the cancel button is clicked.
   *
   * @returns void
   */
  onCancel(): void {
    const confirmSubscription = this.notification.confirm('Bearbeitung abbrechen?', 'Alle Änderungen gehen verloren.', 'Nein', 'Ja, abbrechen').subscribe((confirmed) => {
      if (confirmed) {
        //this.router.navigate(['/course-page-student', this.taskAttemptData.courseId]);
      }
    });
    this.subscriptions.push(confirmSubscription);
  }

  /**
   * Handles the event when the user accepts the changes.
   * Displays an information message and a success message upon successful saving of the submission.
   */
  onAccept(data: editorDataDTO) {
    this.notification.info("Änderungen werden übernommen...");
    this.taskAttemptData.attemptData = data;
    //const setTaskAttemptDataSubscription = this.dtcs.setTaskAttemptData(this.taskAttemptData).subscribe((data: taskAttemptDataDTO) => {
    const setTaskAttemptDataSubscription = this.dtcs.commitAttemptGetPoints(this.taskAttemptData).subscribe((data: {points: number, highlightData: editorDataDTO}) => {
      this.isSubmitted = !this.isSubmitted;
      this.reachedPoints = data.points;
      console.log("score: ", data.points, "hdata: ", data.highlightData);
      //after 0.5 seconds, the transition is finished
      if (this.isSubmitted) {
        setTimeout(() => {
          this.helpVisible = true;
        }, 500);
      } else {
        this.isSubmitted = true;
        //this.helpVisible = false;
      }

    });
    this.subscriptions.push(setTaskAttemptDataSubscription);


    this.notification.success("Abgabe wurde erfolgreich gespeichert!");
    //this.router.navigate(['/course-page-student', this.taskAttemptData.courseId]);
  }

  /**
   * Opens the task description popup dialog.
   *
   * @returns void
   */
  openDescription(): void {
    const dialog = this.dialog.open(TaskDescriptionPopupComponent, {
      width: '50%',
      height: '80%',
      data: {description: this.taskWorkspaceData.description}
    });

    const dialogSubscription = dialog.afterClosed().subscribe(result => {
      if(result){
        this.taskWorkspaceData.description = result;
      }
    });
    this.subscriptions.push(dialogSubscription);
  }

  /**
 * Called when the component is about to be destroyed.
 * Unsubscribes from all subscriptions to prevent memory leaks.
 *
 * @memberof CourseEditComponent
 * @public
 * @returns {void}
 */
  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

}

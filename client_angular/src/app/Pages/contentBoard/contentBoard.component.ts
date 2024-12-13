import { ProgressService } from 'src/app/Services/progress/progress.service';
import { ContentDTO, ContentsForConceptDTO, LinkableContentElementDTO, questionType } from '@DTOs/index';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { ContentViewComponent } from '../contentView/contentView.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { McTaskComponent } from '../contentView/contentElement/mcTask/mcTask.component';
import { FreeTextTaskComponent } from '../contentView/contentElement/free-text-task/free-text-task.component';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';
import { UserService } from 'src/app/Services/auth/user.service';
import { CreateContentElementDialogComponent } from '../lecturersView/create-content-element-dialog/create-content-element-dialog.component';
import { ContentLinkerService } from 'src/app/Services/contentLinker/content-linker.service';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FillinTaskNewComponent } from '../contentView/contentElement/fill-in-task-new/fill-in-task-new.component';
import { TaskViewData } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';

@Component({
  selector: 'app-contentBoard',
  templateUrl: './contentBoard.component.html',
  styleUrls: ['./contentBoard.component.css'],
})
export class ContentBoardComponent implements OnInit, OnChanges, OnDestroy {

  /**
   * Event emitter that triggers a refresh of the contents for the current concept
   * Used to notify parent components when content needs to be reloaded
   */
  @Output() fetchContentsForConcept = new EventEmitter<void>();

  /**
   * The ID of the currently active concept node
   * Used to identify which concept's content should be displayed
   * Can be undefined if no concept is selected
   */
  @Input() activeConceptNodeId: number | undefined;

  /**
   * The contents for the active concept node
   */
  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  @ViewChild(MatSort) sort: MatSort;

  /**
   * Columns to be displayed in the table
   */
  displayedColumns: string[] = [
    'id',
    'name',
    'type',
    'progress',
    'actions'
  ];

  /**
   * Data source for the MatTable
   */
  dataSource: MatTableDataSource<TaskViewData>;

  /**
   * Subject to manage subscriptions and trigger their unsubscription on component destruction
   */
  private destroy$ = new Subject<void>();

  // for lecturers view
  protected isAdmin: boolean = false;
  protected editModeActive: boolean = false;

  constructor(
    private router: Router,
    public dialog: MatDialog,
    public sSS: ScreenSizeService,
    private progressService: ProgressService,
    private userService: UserService,
    private contentLinkerService: ContentLinkerService,
    private confirmService: ConfirmationService,
    private snackBar: MatSnackBar,
    private questionDataService: QuestionDataService
  ) {
    // Initialize the data source for the table
    this.dataSource = new MatTableDataSource<TaskViewData>();
    this.sort = new MatSort();

    // for lecturers view
    this.isAdmin = this.userService.getRole() === 'ADMIN';
  }

  ngOnInit() {
    // Subscribe to screen size changes for responsive design
    this.userService.hasEditModeActive$.subscribe((hasEditModeActive) => {
      this.editModeActive = hasEditModeActive;
      if (hasEditModeActive) {
        this.updateDisplayedColumns(['id', 'name', 'type','progress', 'actions']);
      } else {
        this.sSS.isHandset.pipe(takeUntil(this.destroy$)).subscribe((isHandset) => {
          if (isHandset) {
            this.updateDisplayedColumns(['name', 'type', 'progress', 'actions']);
          }
        });

        this.sSS.isTablet.pipe(takeUntil(this.destroy$)).subscribe((isTablet) => {
          if (isTablet) {
            this.updateDisplayedColumns(['id','name','type', 'progress', 'actions']);
          }
        });
      }
    });
  }

  /**
   * @description
   * Updates the columns displayed in the table based on screen size
   * @param columns - Array of column names to be displayed
   */
  updateDisplayedColumns(columns: string[]) {
    this.displayedColumns = columns;
  }

  /**
   * @description
   * Lifecycle hook that is called when any data-bound property of a directive changes.
   * Updates the data source when the input properties change.
   */
  ngOnChanges() {
    this.updateDataSource();
  }

  /**
   * @description
   * Lifecycle hook that is called after the view has been initialized.
   * Sets up sorting for the table.
   */
  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  /**
   * @description
   * Lifecycle hook that is called when the component is about to be destroyed.
   * Cleans up subscriptions to prevent memory leaks.
   */
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * @description
   * Handles the click event for content elements Video and PDF.
   * Opens a dialog to display the content and updates progress if necessary.
   * @param {ContentDTO} content - The ContentDTO object that was clicked
   * @param {string[]} type - Array of content types
   * @param {MouseEvent} event - The mouse event
   */
  async onContentClick(content: ContentDTO, type: string[], event: MouseEvent) {
    // Prevent event propagation to parent elements
    event.stopPropagation();

    const dialogConfig = new MatDialogConfig();

    // Determine if the device is in landscape mode
    const isLandscape = await firstValueFrom(this.sSS.isLandscape);

    // Set dialog dimensions based on screen orientation
    dialogConfig.width = isLandscape ? '70vw' : '90%';
    dialogConfig.maxHeight = isLandscape ? '95vh' : '80vh';

    // Set dialog data
    dialogConfig.data = {
      contentViewData: content,
      conceptNodeId: this.activeConceptNodeId,
      contentTypes: type,
    };

    // Open the dialog
    const dialogRef = this.dialog.open(ContentViewComponent, dialogConfig);

    // Handle dialog close event
    // We use this to update the data source and refresh graph is progress is 100%
    if (type[0] != "VIDEO" && type[0] != "PDF") { // Dont update progress for video and pdf
      dialogRef.afterClosed().subscribe(() => {
        // Find the updated content in contentsForActiveConceptNode
        const updatedContent = this.contentsForActiveConceptNode.trainedBy.find(
          c => c.contentNodeId === content.contentNodeId
        );

        // If the content is fully completed (100% progress), trigger a graph update
        if (updatedContent && updatedContent.progress > 99) {
          this.progressService.answerSubmitted();
        }
      });
    }
  }

  /**
   * @description
   * Handles the click event for content elements MC, SC, FreeText, or CodingQuestion
   * Opens a dialog or navigates to the appropriate component based on the task type.
   * @param {TaskViewData} selectedTask - The TaskViewData object that was clicked (The task)
   * @param {ContentDTO} selectedContentNode - The ContentDTO object that was clicked (Contains the tasks)
   */
  onTaskClick(selectedTask: TaskViewData, selectedContentNode: ContentDTO) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      taskViewData: selectedTask,
      conceptId: this.activeConceptNodeId,
      questionId: selectedTask.id
    };
    dialogConfig.width = 'auto';
    dialogConfig.maxHeight = '95vh';
    const conceptId = this.activeConceptNodeId;
    const taskId = selectedTask.id;

    if (conceptId === undefined || taskId === undefined) {
      console.error("Concept ID or Task ID is undefined");
      this.snackBar.open('Ungültige Konzept-ID oder Task-ID.', 'Schließen', { duration: 3000 });
      return;
    }
    let dialogRef: MatDialogRef<McTaskComponent | FreeTextTaskComponent | FillinTaskNewComponent> | undefined;
    // Navigate to the task route


    switch (selectedTask.type) {
      case questionType.SINGLECHOICE:
      case questionType.MULTIPLECHOICE:
      case questionType.FILLIN:
        dialogRef = this.questionDataService.openDialog(selectedTask.type, dialogConfig);
        this.router.navigate([`/dashboard/conceptOverview/${conceptId}/question/${taskId}`]);
        break;
      case questionType.FREETEXT:
        this.router.navigate([`/dashboard/conceptOverview/${conceptId}/question/${taskId}`]);
        break;
      case questionType.CODE:
        // Navigate to coding question component
        this.router.navigate([`/tutor-kai/code/${selectedTask.id}`]);
        break;
      case questionType.GRAPH:
        // Navigate to graph question component
        this.router.navigate([`/graphtask/${selectedTask.id}`]);
        return;
    }

    if (dialogRef) {
      dialogRef.componentInstance.submitClicked
        .pipe(takeUntil(this.destroy$))
        .subscribe((score: number) => {
          // Aktualisiere den Score basierend auf dem neuen Wert
          if (score > selectedTask.progress!) {
            selectedTask.progress = score;
            selectedContentNode.contentElements.find(element => element.id === selectedTask.contentElementId)!.question!.progress = score;

            if (score === 100) {
              // Berechne den Fortschritt des ContentNodes
              const questionElements = selectedContentNode.contentElements.filter(element => element.type === "QUESTION");
              const elementCount = questionElements.length;
              const completedElements = questionElements.filter(element =>
                element.question?.progress === 100 ||
                (element.id === selectedTask.contentElementId && score === 100)
              ).length;

              selectedContentNode.progress = Math.floor((completedElements / elementCount) * 100);

              if (selectedContentNode.progress === 100) {
                this.progressService.answerSubmitted();
              }
            }
          }
        });

      dialogRef.afterClosed().subscribe(() => {
        console.log("dialog closed with id: ", conceptId);
        this.router.navigate([`/dashboard/conceptOverview/${conceptId}`]);
      });
    }
  }

  /**
   * Opens a dialog to create a new task.
   *
   * @param {number} contentNodeId - The ID of the content node.
   */
  onNewTask(contentNodeId: number) {
    console.log("onNewTask");
    if (this.isAdmin){
      const dialogRef = this.dialog.open(CreateContentElementDialogComponent, {
        width: '50vw',
        height: '80vh'
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          console.log('Dialog result:', result);
          if (this.activeConceptNodeId == undefined) {
            console.error("activeConceptNodeId is undefined");
            return;
          }
          const linkableContentElement: LinkableContentElementDTO = {
            contentNodeId: contentNodeId,

            questionId: Number(result.questionId) || undefined,
            question: Number(result.questionId) ? undefined : {
              id: -1, // -1 for temporary id
              text: "",
              isApproved: false, //TODO: implement approval
              name: result.questionTitle || "New question",
              type: result.questionType,
              conceptNodeId: this.activeConceptNodeId,
              description: result.questionDescription || "Manuell per GUI erstellte Frage",
              level: Number(result.questionDifficulty),
              score: Number(result.questionScore) || 100,
            },
            contentElementTitle: result.contentElementTitle || undefined,
            contentElementText: result.contentElementDescription || undefined,
            position: result.contentElementPosition || undefined
          };

          this.contentLinkerService.createLinkedContentElement(linkableContentElement).subscribe(
            (linkableContentElement) => {
              console.log("linked contentElement: ", linkableContentElement);
              this.snackBar.open("Frage erstellt", "OK", { duration: 3000 });
              this.progressService.questionCreated();
              this.fetchContentsForConcept.emit();
            }
          );
        }
      });
    }
  }

  /**
   * @description
   * Handles the approval of a task/question. Currently only logs the action.
   * @param {TaskViewData} taskViewData - The data object containing task information to be approved
   */
  onTaskApprove(taskViewData: TaskViewData) {
    console.log("onTaskApprove: ", taskViewData);
  }

  /**
   * @description
   * Handles the editing of different types of tasks/questions by navigating to the appropriate edit view.
   * Routes to different edit pages based on the question type (multiple choice, free text, fill-in, etc.)
   * @param {TaskViewData} taskViewData - The data object containing task information to be edited
   */
  onTaskEdit(taskViewData: TaskViewData) {
    console.log("onTaskEdit: ", taskViewData);
    switch (taskViewData.type) {
      case questionType.SINGLECHOICE:
      case questionType.MULTIPLECHOICE:
        this.router.navigate(['/editchoice/', taskViewData.id]);
        break;
      case questionType.FREETEXT:
        this.router.navigate(['/editfreetext/', taskViewData.id]);
        break;
      case questionType.FILLIN:
        console.log("FILLIN");
        this.router.navigate(['/editfillin/', taskViewData.id]);
        break;
      case questionType.CODE:
        this.router.navigate(['/editcoding/', taskViewData.id]);
        break;
      case questionType.GRAPH:
        this.router.navigate(['/editgraph/', taskViewData.id]);
        break;
    }
  }

  /**
   * @description
   * Handles the deletion of a task/question link. Shows a confirmation dialog before proceeding.
   * If confirmed, unlinks the content element while preserving the original question.
   * Updates the UI and emits an event to refresh the content list after successful deletion.
   * @param {TaskViewData} element - The element containing the content element ID to be unlinked
   */
  onTaskDelete(element: TaskViewData) {
    console.log("onDeleteClick: ", element);
    this.confirmService.confirm({
      title: "Verknüpfung löschen",
      message: "Die Verknüpfung zur Frage wird gelöscht. Die Frage bleibt bestehen. Fortfahren?",
      acceptLabel: "Löschen",
      declineLabel: "Abbrechen",
      swapButtons: true,
      swapColors: true,
      accept: () => {
        console.log("deleting");
        this.contentLinkerService.unlinkContentElement(element.contentElementId).subscribe(
          (success) => {
            console.log("unlink success: ", success);
            this.snackBar.open("Verknüpfung gelöscht", "OK", { duration: 3000 });
            this.progressService.questionLinkDeleted();
            this.fetchContentsForConcept.emit();
          }
        );
      }, decline: () => {
        console.log("aborted");
      }
    });
  }

  //TODO
  onContentNodeDelete(contentNodeId: number) {
    console.log("onContentNodeDelete", contentNodeId);
  }

  /**
   * @description
   * Updates the data source for the table based on the current contentsForActiveConceptNode
   */
  private updateDataSource() {
    const data: TaskViewData[] = [];
    // Iterate through all content and their elements
    for (let content of this.contentsForActiveConceptNode.trainedBy) {
      for (let contentElement of content.contentElements) {
        // Only include elements with questions
        if (contentElement.question == null) {
          continue;
        }
        // Create a TaskViewData object for each question
        const input: TaskViewData = {
          contentNodeId: content.contentNodeId,
          contentElementId: contentElement.id,
          id: contentElement.question.id,
          name: contentElement.question.name
            ? contentElement.question.name
            : content.name,
          type: contentElement.question.type,
          progress: contentElement.question.progress,
          description: contentElement.question.description,
          level: contentElement.question.level,
        };
        data.push(input);
      }
    }
    // Update the data source with the new data
    this.dataSource.data = data;
  }

  /**
   * @description
   * Generates a router link for a coding question
   * @param {number} index - The ID of the coding question
   * @returns {string} The router link string
   */
  getRouterLink(index: number): string {
    return `/tutor-kai/code/${index}`;
  }

  /**
   * @description
   * Checks if a content has a specific element type
   * @param {ContentDTO} content - The ContentDTO to check
   * @param {string} type - The type to check for
   * @returns {boolean} True if the content has an element of the specified type, false otherwise
   */
  hasContentElementType(content: ContentDTO, type: string): boolean {
    return content.contentElements.some((element) => element.type === type);
  }

  /**
   * @description
   * Filters the data source by content node ID
   * @param {number} contentNodeId - The ID of the content node to filter by
   * @returns {TaskViewData[]} An array of TaskViewData objects for the specified content node
   */
  getFilteredData(contentNodeId: number): TaskViewData[] {
    return this.dataSource.data.filter(
      (element) => element.contentNodeId === contentNodeId
    );
  }

  /**
   * @description
   * Generates an array of a specified length
   * @param {number} num - The length of the array to generate
   * @returns {number[]} An array of the specified length
   */
  getLevels(num: number): number[] {
    return new Array(num);
  }

  /**
   * @description
   * Generates a more readable name for element types
   * @param {string} type - The original element type
   * @returns {string} A more human-readable name for the element type
   */
  genBetterElementNames(type: string): string {
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
        return 'undefiniert';
    }
  }
}

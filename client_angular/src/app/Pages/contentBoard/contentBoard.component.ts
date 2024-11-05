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
import { FillinTaskComponent } from '../contentView/contentElement/fill-in-task/fill-in-task.component';
import { FillinTaskNewComponent } from '../contentView/contentElement/fill-in-task-new/fill-in-task-new.component';


interface TaskViewData {
  contentNodeId: number;
  contentElementId: number;
  id: number;
  name: string;
  type: string;
  progress: number;
  description?: string;
  level: number;
}

@Component({
  selector: 'app-contentBoard',
  templateUrl: './contentBoard.component.html',
  styleUrls: ['./contentBoard.component.css'],
})
export class ContentBoardComponent implements OnInit, OnChanges, OnDestroy {

  @Input() activeConceptNodeId: any;

  /**
   * The contents for the active concept node
   */
  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  @ViewChild(MatSort) sort: MatSort;

  // emitter for refreshing
  @Output() fetchContentsForConcept = new EventEmitter<void>();

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
    private snackBar: MatSnackBar
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
   * @param content - The ContentDTO object that was clicked
   * @param type - Array of content types
   * @param event - The mouse event
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
   * @param taskViewData - The TaskViewData object that was clicked
   */
  onTaskClick(taskViewData: TaskViewData) {
    // Create dialog configuration
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      taskViewData: taskViewData,
    };
    dialogConfig.width = 'auto';
    dialogConfig.maxHeight = '95vh';

    let dialogRef: MatDialogRef<McTaskComponent | FreeTextTaskComponent | FillinTaskNewComponent> | undefined;

    // Open the appropriate dialog based on the task type
    switch (taskViewData.type) {
      case questionType.SINGLECHOICE:
      case questionType.MULTIPLECHOICE:
        dialogRef = this.dialog.open(McTaskComponent, dialogConfig);
        break;
      case questionType.FREETEXT:
        dialogRef = this.dialog.open(FreeTextTaskComponent, dialogConfig);
        break;
      case questionType.CODE:
        // Navigate to coding question component
        this.router.navigate([this.getRouterLink(taskViewData.id)]);
        break;
      case questionType.GRAPH:
        // Navigate to graph question component
        this.router.navigate([`/graphtask/${taskViewData.id}`]);
        return;
      case questionType.FILLIN:
        dialogRef = this.dialog.open(FillinTaskNewComponent, {...dialogConfig, width: '50vw'});
        break;
    }

    // Handle dialog submission if a dialog was opened
    if (dialogRef) {
      const prevScore = taskViewData.progress;

      // Subscribe to dialog events and manage with takeUntil
      dialogRef.componentInstance.submitClicked
        .pipe(takeUntil(dialogRef.afterClosed()))
        .subscribe((score: number) => {
          this.dataSource.data = this.dataSource.data.map((element) => {
            if (element.id === taskViewData.id) {
              // Update the progress value of the task if the new score is higher
              if(score > prevScore) {
                element.progress = score;
              }
              console.log("Element: " +  element.type + ", TaskID: " + element.id + " Answer submitted. Erreichter Score: " + score + " Vorheriger Score: "+ prevScore);

              // Update the contentNode that is connected to the task
              if (score === 100 && prevScore !== 100) {
                this.contentsForActiveConceptNode.trainedBy.forEach((content) => {
                  if (content.contentElements.some(
                    (element) => element.id === taskViewData.contentElementId
                  )) {
                    const questionElements = content.contentElements.filter(element => element.type === "QUESTION");
                    const elementCount = questionElements.length;
                    const completedElements = questionElements.filter(element =>
                      element.question?.progress === 100 ||
                      (element.id === taskViewData.contentElementId && score === 100)
                    ).length;

                    // Calculate progress based on completed elements
                    content.progress = Math.floor((completedElements / elementCount) * 100);

                    if (content.progress === 100) {
                      console.log("Aufgabe wurde zum ersten Mal erfolgreich gelöst.");
                      this.progressService.answerSubmitted();
                    }
                  }
                });
              }
            }
            return element;
          });
        });

      // Clean up subscription when dialog closes
      dialogRef.afterClosed().subscribe(() => {
        // Fetch fresh data from server
        this.fetchContentsForConcept.emit();
      });
    }
  }

  /**
   * Opens a dialog to create a new task.
   *
   * @param contentNodeId - The ID of the content node.
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

  onTaskApprove(taskViewData: TaskViewData) {
    console.log("onTaskApprove: ", taskViewData);
  }

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

  onTaskDelete(element: any) {
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
   * @param index - The ID of the coding question
   * @returns The router link string
   */
  getRouterLink(index: number): string {
    return `/tutor-kai/code/${index}`;
  }

  /**
   * @description
   * Checks if a content has a specific element type
   * @param content - The ContentDTO to check
   * @param type - The type to check for
   * @returns True if the content has an element of the specified type, false otherwise
   */
  hasContentElementType(content: ContentDTO, type: string) {
    return content.contentElements.some((element) => element.type === type);
  }

  /**
   * @description
   * Filters the data source by content node ID
   * @param contentNodeId - The ID of the content node to filter by
   * @returns An array of TaskViewData objects for the specified content node
   */
  getFilteredData(contentNodeId: number) {
    return this.dataSource.data.filter(
      (element) => element.contentNodeId === contentNodeId
    );
  }

  /**
   * @description
   * Generates an array of a specified length
   * @param num - The length of the array to generate
   * @returns An array of the specified length
   */
  getLevels(num: number) {
    return new Array(num);
  }

  /**
   * @description
   * Generates a more readable name for element types
   * @param type - The original element type
   * @returns A more human-readable name for the element type
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

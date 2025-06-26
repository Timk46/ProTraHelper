import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ContentDTO, ContentElementDTO, contentElementType, ContentsForConceptDTO, LinkableContentElementDTO } from '@DTOs/index';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';
import { ProgressService } from 'src/app/Services/progress/progress.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ContentViewComponent } from '../contentView/contentView.component';
import { UserService } from 'src/app/Services/auth/user.service';
import { CreateContentElementDialogComponent } from '../lecturersView/create-content-element-dialog/create-content-element-dialog.component';
import { ContentLinkerService } from 'src/app/Services/contentLinker/content-linker.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { ContentListNodeEditDialogComponent } from './content-list-node-edit-dialog/content-list-node-edit-dialog.component';


@Component({
  selector: 'app-content-list',
  templateUrl: './content-list.component.html',
  styleUrls: ['./content-list.component.scss'],
  animations: [
    trigger('contentExpand', [
      state('collapsed', style({
        height: '0',
        opacity: 0,
        overflow: 'hidden'
      })),
      state('expanded', style({
        height: '*',
        opacity: 1
      })),
      transition('collapsed <=> expanded', animate('200ms ease-out'))
    ])
  ]
})
export class ContentListComponent {

  @Input() activeConceptNodeId: any;
  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  filteredContents: ContentDTO[] = [];

  searchTerm: string = '';
  expandedIndex = 0;
  panelOpenState = false;

  // emitter for refreshing
  @Output() fetchContentsForConcept = new EventEmitter<void>();

  @Output() rhinoButtonClicked = new EventEmitter<void>();

  protected isAdmin: boolean = false;
  protected editModeActive: boolean = false;

  constructor(
    private dialog: MatDialog,
    private sSS: ScreenSizeService,
    private progressService: ProgressService,
    private userService: UserService,
    private contentLinkerService: ContentLinkerService,
    private snackBar: MatSnackBar,
    private confirmService: ConfirmationService
  ) {
    this.isAdmin = this.userService.getRole() === 'ADMIN';
  }

  ngOnInit() {
    this.userService.hasEditModeActive$.subscribe((hasEditModeActive) => {
      this.editModeActive = hasEditModeActive;
    });
  }

  ngOnChanges() {
    if (this.contentsForActiveConceptNode.trainedBy.length > 0) {
      // Sortiere nach position, falls vorhanden
      this.filteredContents = [...this.contentsForActiveConceptNode.trainedBy].sort((a, b) => {
        // Wenn beide Positionen vorhanden sind, sortiere danach
        if (a.position != null && b.position != null) {
          if (a.position === b.position) {
            // Bei gleichen Positionen: nach contentNodeId als Fallback sortieren
            return a.contentNodeId - b.contentNodeId;
          }
          return a.position - b.position;
        }
        // Wenn nur eine Position vorhanden ist, sortiere die mit Position zuerst
        if (a.position != null) return -1;
        if (b.position != null) return 1;
        // Wenn keine Position vorhanden ist, sortiere nach contentNodeId
        return a.contentNodeId - b.contentNodeId;
      });
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
   * Checks if the given content has at least one content element of the specified type.
   *
   * @param content - The content object to check.
   * @param type - The type of content element to look for.
   * @returns `true` if the content has at least one element of the specified type, otherwise `false`.
   */
  hasContentElementType(content: ContentDTO, type: string): boolean {
    return content.contentElements.some((element) => element.type === type);
  }

  /**
   * Filters and returns the content elements of type QUESTION from the given content.
   *
   * @param {ContentDTO} content - The content object containing content elements.
   * @returns {ContentElement[]} An array of content elements that are of type QUESTION.
   */
  getQuestions(content: ContentDTO): ContentElementDTO[] {
    return content.contentElements.filter((element) => element.type === contentElementType.QUESTION);
  }

  /**
   * Retrieves the attachments from the given content.
   * Filters the content elements to include only those of type PDF or VIDEO.
   *
   * @param content - The content object containing content elements.
   * @returns An array of content elements that are either of type PDF or VIDEO.
   */
  getAttachments(content: ContentDTO): ContentElementDTO[] {
    return content.contentElements.filter((element) => element.type === contentElementType.PDF || element.type === contentElementType.VIDEO);
  }

  /**
   * Handles the click event on a content item.
   *
   * @param content - The content data transfer object (DTO) representing the clicked content.
   * @param type - An array of strings representing the type of the content.
   * @param event - The mouse event triggered by the click.
   *
   * This method stops the propagation of the click event, configures and opens a dialog to display the content,
   * and updates the progress if the content type is not "VIDEO" or "PDF". If the content is fully completed (100% progress),
   * it triggers a graph update.
   */
  async onContentClick(content: ContentDTO, type: string[], event: MouseEvent) {
    event.stopPropagation();
    const dialogConfig = new MatDialogConfig();
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

  // TODO: update total score without reloading
  onScoreUpdated(contentNode: ContentDTO, elementData: ContentElementDTO) {
    //console.log("Score updated:", elementData.question?.progress);
    const foundContent = this.contentsForActiveConceptNode.trainedBy.find(content => content.contentNodeId === contentNode.contentNodeId);
    if (foundContent) {
      const foundElement = foundContent.contentElements.find(element => element.id === elementData.id);
      if (foundElement && foundElement.question && elementData.question) {
        foundElement.question.progress = elementData.question.progress;
        foundContent.progress = this.progressService.calculateProgress(foundContent);
        if(elementData.question.progress == 100) {
          foundContent.levelProgress = this.progressService.calculateLevelProgress(foundContent);
        }
      }
    }
    this.applyFilter();
  }

  /**
   * Filters the contents based on the provided search term.
   *
   * @param term - The search term to filter the contents. If not provided, defaults to an empty string.
   *
   * If the term is not an empty string, it updates the searchTerm property with the provided term.
   * Then, it filters the contentsForActiveConceptNode.trainedBy array based on whether the concatenated
   * string of content name and content elements (id and title) includes the search term (case insensitive).
   * If the term is an empty string, it resets the filteredContents to the original contentsForActiveConceptNode.trainedBy array.
   */
  applyFilter(term: string = '') {
    if (term !== '') this.searchTerm = term;
    if (this.searchTerm != '') {
      this.filteredContents = this.contentsForActiveConceptNode.trainedBy.filter(content => {
        let context: string = content.name + ' ';
        content.contentElements.forEach(element => {
          context += element.id + ' ' + element.title + ' ';
        });
        return context.toLowerCase().includes(this.searchTerm.toLowerCase());
      });
    } else {
      this.filteredContents = this.contentsForActiveConceptNode.trainedBy;
    }
  }

  /**
   * Opens a dialog to create a new task.
   *
   * @param contentNodeId - The ID of the content node.
   */
  onAddTask(contentNodeId: number) {
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

          console.log("linkableContentElement: ", linkableContentElement);

          this.contentLinkerService.createLinkedContentElement(linkableContentElement).subscribe(
            (linkableContentElement) => {
              console.log("linked contentElement: ", linkableContentElement);
              this.snackBar.open("Frage erstellt", "OK", { duration: 3000 });
              this.progressService.questionCreated();
              this.fetchContentsForConcept.emit(); // TODO: make this dynamic
            }
          );
        }
      });
    }
  }

  /**
   * Handles the deletion of a content element from a content node.
   *
   * This method iterates through the `contentsForActiveConceptNode.trainedBy` array and
   * removes the content element with the specified `contentElementId` from the content node
   * with the specified `contentNodeId`. After the deletion, it applies the current filter.
   *
   * @param contentNodeId - The ID of the content node from which the content element is to be deleted.
   * @param contentElementId - The ID of the content element to be deleted.
   */
  onContentElementDeleted(contentNodeId: number, contentElementId: number) {
    this.contentsForActiveConceptNode.trainedBy.forEach(content => {
      if (content.contentNodeId === contentNodeId) {
        content.contentElements = content.contentElements.filter(element => element.id !== contentElementId);
      }
    });
    this.applyFilter();
  }

  // TODO: implement
  onDeleteContentNode(contentNodeId: number) {
    console.log("onContentNodeDelete", contentNodeId);
    this.confirmService.confirm({
      title: "Bereich löschen?",
      message: "Dieser Bereich wird gelöscht und alle darin entahltenen Verknüpfungen werden aufgehoben. Die darin verknüpften Inhalte bleiben bestehen. Fortfahren?",
      acceptLabel: "Löschen",
      declineLabel: "Abbrechen",
      swapButtons: true,
      swapColors: true,
      accept: () => {
        console.log("deleting");

        // TODO: implement

      }, decline: () => {
        console.log("aborted");
      }
    });
  }

  /**
   * Bereich nach oben verschieben
   */
  onMoveContentUp(content: ContentDTO) {
    if (content.position == null) return;
    this.contentLinkerService.updateContentNodePosition(content.contentNodeId, content.position - 1).subscribe(() => {
      this.fetchContentsForConcept.emit();
    });
  }

  /**
   * Bereich nach unten verschieben
   */
  onMoveContentDown(content: ContentDTO) {
    if (content.position == null) return;
    this.contentLinkerService.updateContentNodePosition(content.contentNodeId, content.position + 1).subscribe(() => {
      this.fetchContentsForConcept.emit();
    });
  }

  /**
   * Öffnet den Dialog zum Bearbeiten eines ContentNodes
   */
  onEditContentNode(content: ContentDTO) {
    const dialogRef = this.dialog.open(ContentListNodeEditDialogComponent, {
      width: '400px',
      data: content
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Backend-Update hier aufrufen (muss ggf. noch implementiert werden)
        this.contentLinkerService.updateContentNode(content.contentNodeId, result).subscribe(() => {
          this.snackBar.open('Bereich aktualisiert', 'OK', { duration: 2000 });
          this.fetchContentsForConcept.emit();
        });
      }
    });
  }

  /**
   * Handles Rhino button click - emits event to parent component
   * @param event - Mouse event to prevent propagation
   */
  onRhinoButtonClick(event: MouseEvent): void {
    // Prevent event propagation to avoid expanding/collapsing the panel
    event.stopPropagation();

    // Emit event to parent component (conceptOverview) which handles the Rhino integration
    this.rhinoButtonClicked.emit();
  }

}

import { OnInit, OnChanges, Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ContentDTO,
  ContentElementDTO,
  ContentsForConceptDTO,
  LinkableContentElementDTO,
  questionType,
} from '@DTOs/index';
import { contentElementType } from '@DTOs/index';
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
import { BatRhinoService } from '../../Services/bat-rhino.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-content-list',
  templateUrl: './content-list.component.html',
  styleUrls: ['./content-list.component.scss'],
  animations: [
    trigger('contentExpand', [
      state(
        'collapsed',
        style({
          height: '0',
          opacity: 0,
          overflow: 'hidden',
        }),
      ),
      state(
        'expanded',
        style({
          height: '*',
          opacity: 1,
        }),
      ),
      transition('collapsed <=> expanded', animate('200ms ease-out')),
    ]),
  ],
})
export class ContentListComponent implements OnInit, OnChanges {
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
    private readonly dialog: MatDialog,
    private readonly sSS: ScreenSizeService,
    private readonly progressService: ProgressService,
    private readonly userService: UserService,
    private readonly contentLinkerService: ContentLinkerService,
    private readonly snackBar: MatSnackBar,
    private readonly confirmService: ConfirmationService,
    private readonly batRhinoService: BatRhinoService,
  ) {
    this.isAdmin = this.userService.getRole() === 'ADMIN';
  }

  ngOnInit() {
    this.userService.hasEditModeActive$.subscribe(hasEditModeActive => {
      this.editModeActive = hasEditModeActive;
    });
  }

  ngOnChanges() {
    if (this.contentsForActiveConceptNode.trainedBy.length > 0) {
      // Sortiere nach position, falls vorhanden
      let sortedContents = [...this.contentsForActiveConceptNode.trainedBy].sort((a, b) => {
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

      this.filteredContents = sortedContents;
      console.log('Contents for concept node changed:', this.filteredContents);
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
   * Checks if the given content has at least one content element of the specified type.
   *
   * @param content - The content object to check.
   * @param type - The type of content element to look for.
   * @returns `true` if the content has at least one element of the specified type, otherwise `false`.
   */
  hasContentElementType(content: ContentDTO, type: string): boolean {
    return content.contentElements.some(element => element.type === type);
  }

  /**
   * Determines if the Rhino button should be shown for the given content.
   * For architecture students: only show for "Analyse Teil 1" content.
   * For other users: show for all content with QUESTION type (original behavior).
   *
   * @param content - The content object to check.
   * @returns `true` if the Rhino button should be displayed, otherwise `false`.
   */
  shouldShowRhinoButton(content: ContentDTO): boolean {
    // Check if content has questions first (base requirement)
    if (!this.hasContentElementType(content, 'QUESTION')) {
      return false;
    }

    // For architecture students: only show for "Analyse Teil 1"
    if (this.userService.isArchitectureStudent()) {
      return content.name.toLowerCase().includes('analyse teil 1');
    }

    // For regular users: show for all content with questions (original behavior)
    return true;
  }

  /**
   * Filters and returns the content elements of type QUESTION from the given content.
   * Elements are sorted by their position in the specific content view.
   *
   * @param {ContentDTO} content - The content object containing content elements.
   * @returns {ContentElement[]} An array of content elements that are of type QUESTION, sorted by position.
   */
  getQuestions(content: ContentDTO): ContentElementDTO[] {
    return content.contentElements
      .filter(element => element.type === contentElementType.QUESTION)
      .sort(
        (a, b) => (a.positionInSpecificContentView || 0) - (b.positionInSpecificContentView || 0),
      );
  }

  /**
   * Retrieves the attachments from the given content.
   * Filters the content elements to include only those of type PDF or VIDEO and sorts them by position.
   *
   * @param content - The content object containing content elements.
   * @returns An array of content elements that are either of type PDF or VIDEO, sorted by position.
   */
  getAttachments(content: ContentDTO): ContentElementDTO[] {
    return content.contentElements
      .filter(
        element =>
          element.type === contentElementType.PDF || element.type === contentElementType.VIDEO,
      )
      .sort(
        (a, b) => (a.positionInSpecificContentView || 0) - (b.positionInSpecificContentView || 0),
      );
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
    if (type[0] != 'VIDEO' && type[0] != 'PDF') {
      // Dont update progress for video and pdf
      dialogRef.afterClosed().subscribe(() => {
        // Find the updated content in contentsForActiveConceptNode
        const updatedContent = this.contentsForActiveConceptNode.trainedBy.find(
          c => c.contentNodeId === content.contentNodeId,
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
    const foundContent = this.contentsForActiveConceptNode.trainedBy.find(
      content => content.contentNodeId === contentNode.contentNodeId,
    );
    if (foundContent) {
      const foundElement = foundContent.contentElements.find(
        element => element.id === elementData.id,
      );
      if (foundElement?.question && elementData.question) {
        foundElement.question.progress = elementData.question.progress;
        foundContent.progress = this.progressService.calculateProgress(foundContent);
        if (elementData.question.progress == 100) {
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

    let baseContents = [...this.contentsForActiveConceptNode.trainedBy];

    if (this.searchTerm != '') {
      this.filteredContents = baseContents.filter(content => {
        let context: string = content.name + ' ';
        content.contentElements.forEach(element => {
          context += element.id + ' ' + element.title + ' ';
        });
        return context.toLowerCase().includes(this.searchTerm.toLowerCase());
      });
    } else {
      this.filteredContents = baseContents;
    }
  }

  /**
   * Opens a dialog to create a new task.
   *
   * @param contentNodeId - The ID of the content node.
   */
  onAddTask(contentNodeId: number) {
    console.log('onNewTask');
    if (this.isAdmin) {
      const dialogRef = this.dialog.open(CreateContentElementDialogComponent, {
        width: '50vw',
        height: '80vh',
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          console.log('Dialog result:', result);
          if (this.activeConceptNodeId == undefined) {
            console.error('activeConceptNodeId is undefined');
            return;
          }
          const linkableContentElement: LinkableContentElementDTO = {
            contentNodeId: contentNodeId,

            questionId: Number(result.questionId) || undefined,
            question: Number(result.questionId)
              ? undefined
              : {
                  id: -1, // -1 for temporary id
                  text: '',
                  isApproved: false, //TODO: implement approval
                  name: result.questionTitle || 'New question',
                  type: result.questionType,
                  conceptNodeId: this.activeConceptNodeId,
                  description: result.questionDescription || 'Manuell per GUI erstellte Frage',
                  level: Number(result.questionDifficulty),
                  score: Number(result.questionScore) || 100,
                },
            contentElementTitle: result.contentElementTitle || undefined,
            contentElementText: result.contentElementDescription || undefined,
            position: result.contentElementPosition || undefined,
          };

          console.log('linkableContentElement: ', linkableContentElement);

          this.contentLinkerService
            .createLinkedContentElement(linkableContentElement)
            .subscribe(linkableContentElement => {
              console.log('linked contentElement: ', linkableContentElement);
              this.snackBar.open('Frage erstellt', 'OK', { duration: 3000 });
              this.progressService.questionCreated();
              this.fetchContentsForConcept.emit(); // TODO: make this dynamic
            });
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
        content.contentElements = content.contentElements.filter(
          element => element.id !== contentElementId,
        );
      }
    });
    this.applyFilter();
  }

  onTaskDrop(event: CdkDragDrop<ContentElementDTO[]>, content: ContentDTO) {
    if (!this.editModeActive || event.previousIndex === event.currentIndex) {
      return;
    }

    const questionElements = this.getQuestions(content);
    const movedElement = questionElements[event.previousIndex];

    moveItemInArray(questionElements, event.previousIndex, event.currentIndex);

    // Update the positionInSpecificContentView for all question elements
    questionElements.forEach((element, index) => {
      element.positionInSpecificContentView = index + 1;
    });

    // Create array with new order of element IDs
    const orderedElementIds = questionElements.map(element => element.id);

    console.log(
      'Updating position for element:',
      movedElement.id,
      'from position',
      event.previousIndex,
      'to',
      event.currentIndex,
      'New order:',
      orderedElementIds,
    );

    this.contentLinkerService
      .updateContentElementPositions(content.contentNodeId, orderedElementIds)
      .subscribe({
        next: () => {
          this.snackBar.open('Reihenfolge aktualisiert', 'OK', { duration: 2000 });
        },
        error: (err: any) => {
          console.error('Failed to update order', err);
          this.snackBar.open('Fehler beim Aktualisieren der Reihenfolge', 'OK', {
            duration: 3000,
          });
          // Revert local changes on error
          this.fetchContentsForConcept.emit();
        },
      });
  }

  onContentNodeDrop(event: CdkDragDrop<ContentDTO[]>) {
    if (!this.editModeActive || event.previousIndex === event.currentIndex) {
      return;
    }

    const movedContent = this.filteredContents[event.previousIndex];

    moveItemInArray(this.filteredContents, event.previousIndex, event.currentIndex);

    // Update the position for all content nodes
    this.filteredContents.forEach((content, index) => {
      content.position = index + 1;
    });

    // Create array with new order of content node IDs
    const orderedNodeIds = this.filteredContents.map(content => content.contentNodeId);

    console.log(
      'Updating position for content node:',
      movedContent.contentNodeId,
      'from position',
      event.previousIndex,
      'to',
      event.currentIndex,
      'New order:',
      orderedNodeIds,
    );

    // Use the active concept node ID
    const conceptNodeId = this.activeConceptNodeId;

    this.contentLinkerService.updateContentNodePositions(conceptNodeId, orderedNodeIds).subscribe({
      next: () => {
        this.snackBar.open('Bereich-Reihenfolge aktualisiert', 'OK', { duration: 2000 });
      },
      error: (err: any) => {
        console.error('Failed to update content node order', err);
        this.snackBar.open('Fehler beim Aktualisieren der Bereich-Reihenfolge', 'OK', {
          duration: 3000,
        });
        // Revert local changes on error
        this.fetchContentsForConcept.emit();
      },
    });
  }

  // TODO: implement
  onDeleteContentNode(contentNodeId: number) {
    console.log('onContentNodeDelete', contentNodeId);
    this.confirmService.confirm({
      title: 'Bereich löschen?',
      message:
        'Dieser Bereich wird gelöscht und alle darin entahltenen Verknüpfungen werden aufgehoben. Die darin verknüpften Inhalte bleiben bestehen. Fortfahren?',
      acceptLabel: 'Löschen',
      declineLabel: 'Abbrechen',
      swapButtons: true,
      swapColors: true,
      accept: () => {
        console.log('deleting');

        // TODO: implement
      },
      decline: () => {
        console.log('aborted');
      },
    });
  }

  // deprecated
  /**
   * Bereich nach oben verschieben
   */
  /* onMoveContentUp(content: ContentDTO) {
    if (content.position == null) return;
    this.contentLinkerService
      .updateContentNodePosition(content.contentNodeId, content.position - 1)
      .subscribe(() => {
        this.fetchContentsForConcept.emit();
      });
  } */

  // deprecated
  /**
   * Bereich nach unten verschieben
   */
  /* onMoveContentDown(content: ContentDTO) {
    if (content.position == null) return;
    this.contentLinkerService
      .updateContentNodePosition(content.contentNodeId, content.position + 1)
      .subscribe(() => {
        this.fetchContentsForConcept.emit();
      });
  } */

  /**
   * Öffnet den Dialog zum Bearbeiten eines ContentNodes
   */
  onEditContentNode(content: ContentDTO) {
    const dialogRef = this.dialog.open(ContentListNodeEditDialogComponent, {
      width: '400px',
      data: content,
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

  onNodeVisibilityToggle(content: ContentDTO) {
    if (!this.isAdmin || content.isVisible == undefined) return;

    content.isVisible = !content.isVisible;

    this.contentLinkerService
      .updateContentNodeVisibility(
        this.activeConceptNodeId,
        content.contentNodeId,
        content.isVisible,
      )
      .subscribe(() => {
        this.snackBar.open('Sichtbarkeit aktualisiert', 'OK', { duration: 2000 });
        this.filteredContents.find(c => c.contentNodeId === content.contentNodeId)!.isVisible =
          content.isVisible;
      });
  }

  /**
   * Handles Direct Bat-Rhino button click - executes Rhino directly via .bat script
   * Best Practice: Ein-Klick-Lösung für sofortige Rhino-Ausführung
   * @param event - Mouse event to prevent propagation
   */
  async onRhinoBatDirectButtonClick(event: MouseEvent): Promise<void> {
    event.stopPropagation();

    console.log('⚡ Direct Bat-Rhino button clicked - executing Rhino directly');

    const exampleFilePath = 'C:\\Dev\\hefl\\files\\Grasshopper\\example.gh';
    const fileName = 'example.gh';

    try {
      // Show loading notification
      const loadingSnackBar = this.snackBar.open('⚡ Führe Rhino direkt aus...', 'Abbrechen', {
        duration: 0,
        panelClass: 'info-snackbar',
      });

      // Create request using the service helper method
      const request = this.batRhinoService.createGrasshopperRequest(exampleFilePath);

      console.log('⚡ Sending direct execution request:', request);

      // Execute Rhino directly
      const response = await this.batRhinoService.executeDirectly(request).toPromise();

      loadingSnackBar.dismiss();

      if (response?.success) {
        console.log('✅ Direct Rhino execution successful:', response);

        // Show success message
        this.snackBar.open(
          `🚀 Rhino wurde erfolgreich gestartet! Grasshopper-Datei: ${fileName}`,
          'OK',
          {
            duration: 8000,
            panelClass: 'success-snackbar',
          },
        );

        // Show additional info about what happened
        this.snackBar.open(
          `💡 Rhino läuft jetzt mit der Grasshopper-Datei. Prüfen Sie das Rhino-Fenster.`,
          'OK',
          {
            duration: 6000,
            panelClass: 'info-snackbar',
          },
        );
      } else {
        const errorMessage =
          response?.message || 'Unbekannter Fehler bei der direkten Rhino-Ausführung';
        console.error('❌ Direct Rhino execution failed:', errorMessage);

        this.snackBar.open(`❌ Direkte Rhino-Ausführung fehlgeschlagen: ${errorMessage}`, 'OK', {
          duration: 8000,
          panelClass: 'error-snackbar',
        });

        // Show fallback suggestion
        this.snackBar.open(
          '💡 Tipp: Versuchen Sie es mit dem .bat-Skript-Generator oder den anderen Rhino-Buttons.',
          'OK',
          {
            duration: 6000,
            panelClass: 'info-snackbar',
          },
        );
      }
    } catch (error) {
      console.error('🚨 Direct Rhino execution error:', error);

      // Dismiss loading if still showing
      this.snackBar.dismiss();

      let errorMessage = 'Unbekannter Fehler';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      this.snackBar.open(`🚨 Fehler bei der direkten Rhino-Ausführung: ${errorMessage}`, 'OK', {
        duration: 8000,
        panelClass: 'error-snackbar',
      });

      // Show fallback suggestion
      this.snackBar.open(
        '💡 Tipp: Stellen Sie sicher, dass Rhino installiert ist und der Server läuft.',
        'OK',
        {
          duration: 6000,
          panelClass: 'info-snackbar',
        },
      );
    }
  }
}

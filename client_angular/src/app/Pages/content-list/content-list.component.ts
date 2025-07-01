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
import { RhinoCommandDialogComponent, RhinoCommandDialogData } from '../../features/rhino-command-dialog/rhino-command-dialog.component';
import { RhinoLauncherService } from '../../features/rhino-launcher/rhino-launcher.service';
import { ModernRhinoApiService, CommandType } from '../../Services/modern-rhino-api.service';
import { DirectRhinoLauncherService } from '../../Services/direct-rhino-launcher.service';


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
    private confirmService: ConfirmationService,
    private rhinoService: RhinoLauncherService,
    private modernRhinoApiService: ModernRhinoApiService
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
   * Handles Rhino button click - starts Rhino and shows command dialog
   * @param event - Mouse event to prevent propagation
   */
  onRhinoButtonClick(event: MouseEvent): void {
    // Prevent event propagation to avoid expanding/collapsing the panel
    event.stopPropagation();

    console.log('🦏 Rhino button clicked - starting Rhino and showing command dialog');

    // Hardcoded path for example.gh as requested
    const exampleFilePath = 'C:\\Dev\\hefl\\files\\Grasshopper\\example.gh';
    const fileName = 'example.gh';

    // Start Rhino via helper app (optional - depends on availability)
    this.startRhinoIfPossible(exampleFilePath);

    // Always show the command dialog immediately
    this.showRhinoCommandDialog(fileName, exampleFilePath);
  }

  /**
   * Attempts to start Rhino via helper app (if available)
   */
  private async startRhinoIfPossible(filePath: string): Promise<void> {
    console.log('🔍 DEBUG: startRhinoIfPossible called with filePath:', filePath);

    try {
      // Check if helper app is available
      console.log('🔍 DEBUG: Checking helper app status...');
      const status = await this.rhinoService.getHelperAppStatus().toPromise();

      console.log('🔍 DEBUG: Helper app status received:', status);

      const apiToken = this.rhinoService.getApiToken();
      console.log('🔍 DEBUG: API Token status:', apiToken ? 'Available' : 'Missing');

      console.log('🔍 DEBUG: Condition check results:', {
        hasStatus: !!status,
        rhinoPathConfigured: status?.rhinoPathConfigured,
        hasApiToken: !!apiToken,
        allConditionsMet: !!(status && status.rhinoPathConfigured && apiToken)
      });

      if (status && status.rhinoPathConfigured && apiToken) {
        console.log('🦏 Helper app available - starting Rhino...');
        console.log('🔍 DEBUG: Attempting to launch Rhino with helper app');

        // Start Rhino via helper app
        this.rhinoService.launchRhinoWithHelper(filePath).subscribe({
          next: (response) => {
            console.log('🔍 DEBUG: Launch response received:', response);
            if (response.success) {
              this.snackBar.open('Rhino wird gestartet...', 'OK', {
                duration: 3000,
                panelClass: 'success-snackbar'
              });
            } else {
              console.warn('🦏 Rhino start failed:', response.message);
              this.snackBar.open('Hinweis: Rhino konnte nicht automatisch gestartet werden. Verwenden Sie die Befehle im Dialog.', 'OK', {
                duration: 5000,
                panelClass: 'warn-snackbar'
              });
            }
          },
          error: (error) => {
            console.error('🔍 DEBUG: Launch error:', error);
            console.warn('🦏 Rhino start error:', error);
            this.snackBar.open('Hinweis: Rhino konnte nicht automatisch gestartet werden. Verwenden Sie die Befehle im Dialog.', 'OK', {
              duration: 5000,
              panelClass: 'warn-snackbar'
            });
          }
        });
      } else {
        console.log('🔍 DEBUG: Helper app conditions not met - showing dialog only');
        console.log('🦏 Helper app not available - showing dialog only');

        // Provide specific feedback about what's missing
        let missingInfo = [];
        if (!status) missingInfo.push('Helper-App nicht erreichbar');
        if (status && !status.rhinoPathConfigured) missingInfo.push('Rhino-Pfad nicht konfiguriert');
        if (!apiToken) missingInfo.push('API-Token fehlt');

        const detailMessage = missingInfo.length > 0
          ? `Hinweis: ${missingInfo.join(', ')}. Verwenden Sie die Befehle im Dialog.`
          : 'Hinweis: Starten Sie Rhino manuell und verwenden Sie die Befehle im Dialog.';

        this.snackBar.open(detailMessage, 'OK', {
          duration: 6000,
          panelClass: 'info-snackbar'
        });
      }
    } catch (error) {
      console.error('🔍 DEBUG: Helper app check exception:', error);
      console.log('🦏 Helper app check failed - showing dialog only');
      this.snackBar.open('Hinweis: Helper-App Verbindung fehlgeschlagen. Verwenden Sie die Befehle im Dialog.', 'OK', {
        duration: 4000,
        panelClass: 'info-snackbar'
      });
    }
  }

  /**
   * New modern API method - Execute Grasshopper command via FastAPI backend
   */
  private async executeGrasshopperWithModernAPI(filePath: string): Promise<boolean> {
    try {
      console.log('🚀 Executing Grasshopper command via modern API...');

      // Show loading notification
      const loadingSnackBar = this.snackBar.open(
        'Verbindung zur modernen Rhino API wird hergestellt...',
        'Abbrechen',
        {
          duration: 0,
          panelClass: 'info-snackbar'
        }
      );

      // Check API health first
      const isHealthy = await this.modernRhinoApiService.checkHealth().toPromise();

      if (!isHealthy) {
        console.warn('🚨 Modern Rhino API is not available');
        loadingSnackBar.dismiss();
        this.snackBar.open(
          'Moderne API nicht verfügbar. Verwende traditionelle Methode...',
          'OK',
          { duration: 3000, panelClass: 'warn-snackbar' }
        );
        return false;
      }

      // Execute the Grasshopper command
      const response = await this.modernRhinoApiService.executeGrasshopperCommand(filePath).toPromise();

      loadingSnackBar.dismiss();

      if (response && response.success) {
        console.log('✅ Grasshopper command executed successfully:', response);

        this.snackBar.open(
          `Grasshopper-Datei erfolgreich geladen! (${response.execution_time_ms?.toFixed(0)}ms)`,
          'OK',
          {
            duration: 5000,
            panelClass: 'success-snackbar'
          }
        );

        // Subscribe to WebSocket for real-time updates
        this.modernRhinoApiService.getWebSocketMessages().subscribe(message => {
          if (message.type === 'command_completed' && message.execution_id === response.execution_id) {
            console.log('📡 Real-time update: Command completed via WebSocket');
          }
        });

        return true;
      } else {
        const errorMessage = response?.message || 'Unbekannter Fehler';
        console.error('❌ Grasshopper command failed:', errorMessage);
        this.snackBar.open(
          `Befehl fehlgeschlagen: ${errorMessage}`,
          'OK',
          {
            duration: 5000,
            panelClass: 'error-snackbar'
          }
        );
        return false;
      }

    } catch (error) {
      console.error('🚨 Modern API execution failed:', error);
      this.snackBar.open(
        'Moderne API Fehler. Verwende traditionelle Methode...',
        'OK',
        { duration: 3000, panelClass: 'warn-snackbar' }
      );
      return false;
    }
  }

  /**
   * Enhanced Rhino button click handler with modern API integration
   */
  async onRhinoButtonClickModern(event: MouseEvent): Promise<void> {
    event.stopPropagation();

    console.log('🦏 Modern Rhino button clicked - trying modern API first');

    const exampleFilePath = 'C:\\Dev\\hefl\\files\\Grasshopper\\example.gh';
    const fileName = 'example.gh';

    // Try modern API first
    const modernApiSuccess = await this.executeGrasshopperWithModernAPI(exampleFilePath);

    if (!modernApiSuccess) {
      console.log('🔄 Falling back to traditional method...');
      // Fall back to traditional method
      this.startRhinoIfPossible(exampleFilePath);
      this.showRhinoCommandDialog(fileName, exampleFilePath);
    } else {
      // Modern API succeeded, still show command dialog for educational purposes
      this.snackBar.open(
        'Tipp: Der Befehl wurde automatisch ausgeführt. Dialog zeigt die Details.',
        'OK',
        { duration: 4000, panelClass: 'info-snackbar' }
      );

      // Show dialog with "already executed" information
      this.showRhinoCommandDialog(fileName, exampleFilePath, true);
    }
  }

  /**
   * Shows the Rhino command dialog with the specified command sequence
   */
  private showRhinoCommandDialog(fileName: string, filePath: string, alreadyExecuted: boolean = false): void {
    // Create the exact command sequence as requested
    const commandSequence = `_-Grasshopper B D W L W H D O "${filePath}" W _MaxViewport _Enter`;

    // Create step-by-step instructions
    const commandSteps = [
      {
        step: 1,
        command: '_-Grasshopper',
        description: 'Startet Grasshopper im Skript-Modus (ohne GUI-Dialoge)'
      },
      {
        step: 2,
        command: 'B D W L',
        description: 'Batch mode, Display, Window, Load - Konfiguriert Grasshopper für automatischen Betrieb'
      },
      {
        step: 3,
        command: 'W H',
        description: 'Window Hide - Minimiert das Grasshopper-Fenster nach dem Laden'
      },
      {
        step: 4,
        command: 'D O',
        description: 'Document Open - Bereitet das Öffnen einer Grasshopper-Datei vor'
      },
      {
        step: 5,
        command: `"${filePath}"`,
        description: 'Pfad zur Grasshopper-Datei - Lädt die spezifische .gh-Datei'
      },
      {
        step: 6,
        command: 'W',
        description: 'Window Hide - Versteckt das Grasshopper-Fenster'
      },
      {
        step: 7,
        command: '_MaxViewport',
        description: 'Maximiert das Rhino-Viewport für optimale Ansicht des 3D-Modells'
      },
      {
        step: 8,
        command: '_Enter',
        description: 'Bestätigt alle Befehle und startet die Ausführung'
      }
    ];

    const dialogData: RhinoCommandDialogData = {
      fileName: fileName,
      filePath: filePath,
      commandSequence: commandSequence,
      commandSteps: commandSteps
    };

    console.log('🦏 Opening Rhino command dialog with data:', dialogData);

    try {
      const dialogRef = this.dialog.open(RhinoCommandDialogComponent, {
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        data: dialogData,
        disableClose: false,
        autoFocus: true
      });

      // Handle dialog close
      dialogRef.afterClosed().subscribe(result => {
        if (result && result.completed) {
          this.snackBar.open('Rhino-Befehle erfolgreich übertragen!', 'OK', {
            duration: 3000,
            panelClass: 'success-snackbar'
          });
        }
        console.log('🦏 Rhino command dialog closed with result:', result);
      });

      console.log('🦏 Rhino command dialog opened successfully');
    } catch (error) {
      console.error('🦏 Error opening Rhino command dialog:', error);
      this.snackBar.open(`Fehler beim Öffnen des Dialogs: ${error}`, 'Schließen', {
        duration: 5000,
        panelClass: 'error-snackbar'
      });
    }
  }

}

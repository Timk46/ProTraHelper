import { Component, HostListener, OnDestroy, OnInit, Renderer2, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from "rxjs";
import { CodeSubmissionResultDto } from "@DTOs/index";
import { ConfettiService } from "src/app/Services/animations/confetti.service";
import { ProgressService } from "src/app/Services/progress/progress.service";
import { VideoTimeStampComponent } from '../video-time-stamp/video-time-stamp.component';
import { WorkspaceStateService } from "../../services/workspace-state.service";
import { WorkspaceState, TestResult } from "../../models/code-submission.model";
import { CodeEditorWrapperComponent } from "../../components/code-editor-wrapper/code-editor-wrapper.component";
import { FileExplorerComponent } from "../../components/file-explorer/file-explorer.component";
import { FeedbackPanelTutorFeedbackComponent } from '../../components/feedback-panel-tutor-feedback/feedback-panel-tutor-feedback.component';

@Component({
  selector: 'app-student-workspace',
  templateUrl: './student-workspace.component.html',
  styleUrls: ['./student-workspace.component.scss'],
})
export class StudentWorkspaceComponent implements OnInit, OnDestroy {
  @ViewChild(CodeEditorWrapperComponent) codeEditorWrapper!: CodeEditorWrapperComponent;
  @ViewChild('fileExplorer') fileExplorer!: FileExplorerComponent;
  @ViewChild('structuredFeedbackPanel') structuredFeedbackPanel?: FeedbackPanelTutorFeedbackComponent;

  // TaskID aus der Route
  currentTaskId: number = 0;
  private conceptId!: number;

  // Beschreibungstext und Titel
  taskDescription: string = 'Hi :)\n ich bin Kai. Ich bin hier, um dir Feedback zu deinen Lösungen zu geben.';
  taskTitle: string = 'Aufgabe';

  // Schriftgröße für die Aufgabenbeschreibung
  fontSizePercent: number = 100; // Standardgröße (90%) - leicht reduziert
  readonly MIN_FONT_SIZE: number = 70; // Minimale Schriftgröße (70%)
  readonly MAX_FONT_SIZE: number = 160; // Maximale Schriftgröße (150%)
  readonly FONT_SIZE_STEP: number = 10; // Schrittgröße der Änderung (10%)

  // Layout-States
  isTaskPanelCollapsed: boolean = false;
  fileExplorerCollapsed: boolean = true; // Standardmäßig eingeklappt
  activeTab: 'task' | 'code' | 'output' | 'feedback' = 'code';

  // Neue Layout-Properties für das Grid-Layout
  topRowHeight: number = 40; // 40% der Höhe
  middleRowHeight: number = 60; // 60px Höhe
  bottomRowHeight: number = 40; // 40% der Höhe

  taskPanelWidth: number = 50; // 48% der Breite - some space for file explorer of code editor
  feedbackAreaWidth: number = 50; // 50% der Breite

  // Alte Property für die Migration
  workAreaHeight: number = 70; // Wird entfernt, wenn die Migration abgeschlossen ist

  // Terminal- und Test-Properties
  compilerOutput: string | null = null;
  isCompiling: boolean = false;
  testResults: TestResult[] | null = null;


  // Feedback Panel State
  showStructuredFeedback: boolean = true;
  // Resize-Properties für das neue Layout
  private isHorizontalResizingTop: boolean = false;
  private isHorizontalResizingBottom: boolean = false;
  private isVerticalResizingTop: boolean = false;
  private isVerticalResizingBottom: boolean = false;

  private startX: number = 0;
  private startY: number = 0;

  private startTaskPanelWidth: number = 0;
  private startFeedbackAreaWidth: number = 0;
  private startTopRowHeight: number = 0;
  private startBottomRowHeight: number = 0;

  // Alte Resize-Properties
  private isMainResizing: boolean = false;
  private isResizing: boolean = false;
  private startHeight: number = 0;
  private startWorkAreaHeight: number = 0;

  // Für Unsubscribe
  private destroy$ = new Subject<void>();

  // Event-Listener-Abräumer
  private mouseMoveListener?: () => void;
  private mouseUpListener?: () => void;
  private mainMouseMoveListener?: () => void;
  private mainMouseUpListener?: () => void;

  constructor(
    private progressService: ProgressService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private confettiService: ConfettiService,
    private title: Title,
    private router: Router,
    public workspaceState: WorkspaceStateService,
    private renderer: Renderer2
  ) {
    this.route.paramMap.subscribe(params => {
      this.conceptId = Number(params.get('concept')); // Dies könnte undefined sein, wenn 'concept' ein Query-Parameter ist
      this.currentTaskId = Number(params.get('taskId'));
    });
  }

  ngOnInit(): void {
    this.title.setTitle('GOALS: Tutor Kai');
    this.loadCurrentTask();

    // Abonniere Änderungen am aktuellen Task
    this.workspaceState.currentTask$
      .pipe(takeUntil(this.destroy$))
      .subscribe(task => {
        if (task) {
          // Verwende text (Markdown) statt textHTML für Markdown-Rendering
          this.taskDescription = task.codingQuestion?.textHTML ?? '';
          // Extrahiere den Namen als Titel aus dem Task-Objekt
          this.taskTitle = task.name ?? 'Aufgabe';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Event-Listener entfernen
    this.cleanupEventListeners();
  }

  /**
   * Lädt die aktuelle Aufgabe basierend auf der Route
   */
  private loadCurrentTask(): void {
    if (this.currentTaskId > 0) {
      this.workspaceState.loadTask(this.currentTaskId).subscribe({
        error: (err) => {
          console.error('Error fetching task:', err);
          this.snackBar.open('Fehler beim Laden der Aufgabe.', 'Schließen', { duration: 3000 });
        }
      });
    }
  }

  /**
   * Event-Handler für Klicks auf Links zu Video-Zeitstempeln
   */
  @HostListener('click', ['$event'])
  public onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' && target.getAttribute('href')) {
      event.preventDefault();
      this.openModal(target.getAttribute('href'));
    }
  }

  /**
   * Öffnet das Video-Modal für Zeitstempel-Links
   */
  private openModal(href: string | null) {
    this.dialog.open(VideoTimeStampComponent, { data: { href } });
  }

  /**
   * Behandelt den Start der Code-Ausführung
   */
  onCodeExecutionStart(): void {
    this.isCompiling = true;
    this.compilerOutput = 'Ausführung läuft...';

    // Mobile View: Wechsle zur Output-Ansicht
    if (window.innerWidth <= 768) {
      this.setActiveTab('output');
    }
  }

  /**
   * Behandelt das abgeschlossene Code-Submission-Ergebnis
   */
  onCodeSubmitted(result: CodeSubmissionResultDto): void {
    // Zeige Konfetti-Animation bei 100% Score
    if (result.CodeSubmissionResult.score === 100) {
      this.confettiService.celebrate(6, 800);
      this.progressService.answerSubmitted();
    }

    // Aktualisiere Terminal-Output
    this.isCompiling = false;
    this.compilerOutput = result.CodeSubmissionResult.output || 'Keine Ausgabe';

    // Hole die bereits transformierten Test-Ergebnisse vom Service
    const latestResult = this.workspaceState.getCodeSubmissionResult();
    // Stelle sicher, dass testResults ein Array ist oder null, falls keine Ergebnisse vorhanden sind
    // Assert the type to the local TestResult[] as we know the service transformed it
    this.testResults = (latestResult?.CodeSubmissionResult?.testResults as TestResult[] | undefined) ?? null;

    // Mobile View: Wechsle zur Output-Ansicht nach Code-Ausführung
    if (window.innerWidth <= 768) {
      this.setActiveTab('output');
    }
  }

  /**
   * Klappt das Aufgabenpanel ein oder aus
   */
  toggleTaskPanel(): void {
    this.isTaskPanelCollapsed = !this.isTaskPanelCollapsed;

    // Anpassen der Breite, wenn das Panel ein-/ausgeklappt wird
    if (this.isTaskPanelCollapsed) {
      this.taskPanelWidth = 15; // Minimale Breite, wenn eingeklappt
    } else {
      this.taskPanelWidth = 50; // Standard-Breite, wenn ausgeklappt
    }
  }

  /**
   * Klappt den File Explorer ein oder aus
   */
  toggleFileExplorer(): void {
    this.fileExplorerCollapsed = !this.fileExplorerCollapsed;

    // Rufe ggf. die Toggle-Methode in der FileExplorer-Komponente auf
    if (this.fileExplorer) {
      this.fileExplorer.toggleExplorer();
    }
  }

  /**
   * Vergrößert die Schriftgröße der Aufgabenstellung
   */
  increaseFontSize(): void {
    if (this.fontSizePercent < this.MAX_FONT_SIZE) {
      this.fontSizePercent += this.FONT_SIZE_STEP;
    }
  }

  /**
   * Verkleinert die Schriftgröße der Aufgabenstellung
   */
  decreaseFontSize(): void {
    if (this.fontSizePercent > this.MIN_FONT_SIZE) {
      this.fontSizePercent -= this.FONT_SIZE_STEP;
    }
  }

  // ============ Neue Resize-Methoden für das Grid-Layout ============

  /**
   * Startet den horizontalen Resize für die obere Zeile
   */
  startHorizontalResize(event: MouseEvent): void {
    this.isHorizontalResizingTop = true;
    this.startX = event.clientX;
    this.startTaskPanelWidth = this.taskPanelWidth;

    // Event-Listener hinzufügen
    this.mouseMoveListener = this.renderer.listen('document', 'mousemove', this.onHorizontalResizeMove);
    this.mouseUpListener = this.renderer.listen('document', 'mouseup', this.onHorizontalResizeUp);

    event.preventDefault();
  }

  /**
   * Startet den horizontalen Resize für die untere Zeile
   */
  startHorizontalResizeBottom(event: MouseEvent): void {
    this.isHorizontalResizingBottom = true;
    this.startX = event.clientX;
    this.startFeedbackAreaWidth = this.feedbackAreaWidth;

    // Event-Listener hinzufügen
    this.mouseMoveListener = this.renderer.listen('document', 'mousemove', this.onHorizontalResizeMove);
    this.mouseUpListener = this.renderer.listen('document', 'mouseup', this.onHorizontalResizeUp);

    event.preventDefault();
  }

  /**
   * Startet den vertikalen Resize zwischen oberer und mittlerer Zeile
   */
  startVerticalResizeTop(event: MouseEvent): void {
    this.isVerticalResizingTop = true;
    this.startY = event.clientY;
    this.startTopRowHeight = this.topRowHeight;

    // Event-Listener hinzufügen
    this.mouseMoveListener = this.renderer.listen('document', 'mousemove', this.onVerticalResizeMove);
    this.mouseUpListener = this.renderer.listen('document', 'mouseup', this.onVerticalResizeUp);

    event.preventDefault();
  }

  /**
   * Startet den vertikalen Resize zwischen mittlerer und unterer Zeile
   */
  startVerticalResizeBottom(event: MouseEvent): void {
    this.isVerticalResizingBottom = true;
    this.startY = event.clientY;
    this.startBottomRowHeight = this.bottomRowHeight;

    // Event-Listener hinzufügen
    this.mouseMoveListener = this.renderer.listen('document', 'mousemove', this.onVerticalResizeMove);
    this.mouseUpListener = this.renderer.listen('document', 'mouseup', this.onVerticalResizeUp);

    event.preventDefault();
  }

  /**
   * Handler für horizontale Resize-Bewegung
   */
  private onHorizontalResizeMove = (event: MouseEvent): void => {
    if (this.isHorizontalResizingTop) {
      const containerWidth = document.querySelector('.top-row')?.clientWidth || 1000;
      const delta = ((event.clientX - this.startX) / containerWidth) * 100;

      // Begrenze die Werte (20-80%)
      this.taskPanelWidth = Math.max(20, Math.min(80, this.startTaskPanelWidth + delta));
    } else if (this.isHorizontalResizingBottom) {
      const containerWidth = document.querySelector('.bottom-row')?.clientWidth || 1000;
      const delta = ((event.clientX - this.startX) / containerWidth) * 100;

      // Begrenze die Werte (20-80%)
      this.feedbackAreaWidth = Math.max(20, Math.min(80, this.startFeedbackAreaWidth + delta));
    }
  }

  /**
   * Handler für vertikale Resize-Bewegung
   */
  private onVerticalResizeMove = (event: MouseEvent): void => {
    const containerHeight = document.querySelector('.workspace-container')?.clientHeight || 1000;
    const fixedMiddleHeightPercent = (this.middleRowHeight / containerHeight) * 100;

    if (this.isVerticalResizingTop) {
      const delta = ((event.clientY - this.startY) / containerHeight) * 100;

      // Begrenze die Werte (20-70%)
      const newTopHeight = Math.max(20, Math.min(70, this.startTopRowHeight + delta));
      this.topRowHeight = newTopHeight;

      // Passe die untere Höhe entsprechend an
      this.bottomRowHeight = 100 - newTopHeight - fixedMiddleHeightPercent;
    } else if (this.isVerticalResizingBottom) {
      const delta = ((this.startY - event.clientY) / containerHeight) * 100;

      // Begrenze die Werte (20-70%)
      const newBottomHeight = Math.max(20, Math.min(70, this.startBottomRowHeight + delta));
      this.bottomRowHeight = newBottomHeight;

      // Passe die obere Höhe entsprechend an
      this.topRowHeight = 100 - newBottomHeight - fixedMiddleHeightPercent;
    }
  }

  /**
   * Handler für das Ende der horizontalen Resize-Aktion
   */
  private onHorizontalResizeUp = (): void => {
    this.isHorizontalResizingTop = false;
    this.isHorizontalResizingBottom = false;

    this.cleanupResizeListeners();
  }

  /**
   * Handler für das Ende der vertikalen Resize-Aktion
   */
  private onVerticalResizeUp = (): void => {
    this.isVerticalResizingTop = false;
    this.isVerticalResizingBottom = false;

    this.cleanupResizeListeners();
  }

  /**
   * Räumt die Resize-Event-Listener auf
   */
  private cleanupResizeListeners(): void {
    if (this.mouseMoveListener) {
      this.mouseMoveListener();
      this.mouseMoveListener = undefined;
    }

    if (this.mouseUpListener) {
      this.mouseUpListener();
      this.mouseUpListener = undefined;
    }
  }

  /**
   * Führt den Code aus (delegiert an CodeEditorWrapper)
   */
  executeCode(): void {
    if (this.codeEditorWrapper) {
      this.codeEditorWrapper.submitCode();
    }
  }

  // ============ Alte Resize-Methoden (für Migration) ============

  /**
   * Startet den Resize-Vorgang für das Haupt-Layout (Arbeitsbereich/Feedback)
   * @deprecated Wird durch die neuen Resize-Methoden ersetzt
   */
  startMainResize(event: MouseEvent): void {
    this.isMainResizing = true;
    this.startY = event.clientY;
    this.startWorkAreaHeight = this.workAreaHeight;

    // Event-Listener für den Resize-Vorgang hinzufügen
    this.mainMouseMoveListener = this.renderer.listen('document', 'mousemove', this.onMainMouseMove);
    this.mainMouseUpListener = this.renderer.listen('document', 'mouseup', this.onMainMouseUp);

    // Verhindern der Standard-Drag-Aktionen
    event.preventDefault();
  }

  /**
   * Behandelt die Mausbewegung während des Haupt-Layout-Resizens
   * @deprecated Wird durch die neuen Resize-Methoden ersetzt
   */
  private onMainMouseMove = (event: MouseEvent): void => {
    if (!this.isMainResizing) return;

    // Berechne Höhenänderung als Prozentsatz der Container-Höhe
    const containerHeight = document.querySelector('.workspace-container')?.clientHeight || 1000;
    const delta = ((this.startY - event.clientY) / containerHeight) * 100;

    // Begrenze die Werte auf sinnvolle Grenzen (30-85%)
    const newHeight = Math.max(30, Math.min(85, this.startWorkAreaHeight + delta));
    this.workAreaHeight = newHeight;
  }

  /**
   * Beendet den Haupt-Layout-Resize-Vorgang
   * @deprecated Wird durch die neuen Resize-Methoden ersetzt
   */
  private onMainMouseUp = (): void => {
    this.isMainResizing = false;

    // Event-Listener sauber entfernen
    if (this.mainMouseMoveListener) {
      this.mainMouseMoveListener();
      this.mainMouseMoveListener = undefined;
    }

    if (this.mainMouseUpListener) {
      this.mainMouseUpListener();
      this.mainMouseUpListener = undefined;
    }
  }

  // Der alte Resize-Handle zwischen Code-Editor und Terminal wurde entfernt

  /**
   * Räumt alle Event-Listener auf
   */
  private cleanupEventListeners(): void {
    this.cleanupResizeListeners();

    if (this.mainMouseMoveListener) {
      this.mainMouseMoveListener();
      this.mainMouseMoveListener = undefined;
    }

    if (this.mainMouseUpListener) {
      this.mainMouseUpListener();
      this.mainMouseUpListener = undefined;
    }
  }

  /**
   * Setzt den aktiven Tab für die mobile Ansicht
   */
  setActiveTab(tab: 'task' | 'code' | 'output' | 'feedback'): void {
    this.activeTab = tab;
  }

  /**
   * Navigiert zurück zum Dashboard
   */
  navigateToDashboard(): void {
    if (this.conceptId) {
      this.router.navigate([`/dashboard/concept/${this.conceptId}`]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Hilfsmethode, um den aktuellen Workspace-Zustand zu prüfen
   */
  isState(state: WorkspaceState): boolean {
    return this.workspaceState.getCurrentState() === state;
  }


  /**
   * Checks if the structured feedback can be requested (typically after code submission)
   */
  canRequestStructuredFeedback(): boolean {
    return this.workspaceState.getCurrentState() === WorkspaceState.SUBMITTED_CODE;
  }

  /**
   * Handler for when the feedback view toggle changes.
   * Can be used for additional logic if needed in the future.
   */
  onFeedbackViewChange(): void {
    // Currently no specific logic needed here as ngModel handles the state.
    // If the structured panel should auto-fetch on toggle, add logic here:
    // if (this.showStructuredFeedback && this.canRequestStructuredFeedback()) {
    //   this.structuredFeedbackPanel?.fetchFeedback();
    // }
  }
}

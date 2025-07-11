import type { OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import type { FormArray, FormBuilder } from '@angular/forms';
import { Validators } from '@angular/forms';
import type { QuestionDTO, CodeSubmissionResultDto } from '@DTOs/index';
import type { CodeEditorComponent } from '../../sites/code-editor/code-editor.component';
import type { WorkspaceStateService } from '../../services/workspace-state.service';
import type { FileSystemService, EditorFile } from '../../services/file-system.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-code-editor-wrapper',
  templateUrl: './code-editor-wrapper.component.html',
  styleUrls: ['./code-editor-wrapper.component.scss'],
})
export class CodeEditorWrapperComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('codeEditorMonaco') codeEditorComponent?: CodeEditorComponent;
  @Input() currentTask: QuestionDTO | null = null;
  @Output() codeSubmitted = new EventEmitter<CodeSubmissionResultDto>();
  @Output() executionStarted = new EventEmitter<void>();

  isSubmitting = false;
  language = 'python';
  activeFile: EditorFile | null = null;
  private readonly destroy$ = new Subject<void>();
  private isLocalUpdate = false; // Flag für lokale Updates durch Benutzereingaben

  // Form für Input-Argumente
  inputArgsForm = this.fb.group({
    argsArray: this.fb.array([]),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly workspaceState: WorkspaceStateService,
    private readonly fileSystem: FileSystemService,
  ) {}

  ngOnInit(): void {
    this.setupInputArgs();

    // Beobachte Änderungen der aktiven Datei
    this.fileSystem.activeFile$.pipe(takeUntil(this.destroy$)).subscribe(file => {
      this.activeFile = file;
      // Nur aktualisieren, wenn es kein lokaler Update ist (verhindert Fokusverlust)
      if (file && this.codeEditorComponent && !this.isLocalUpdate) {
        this.codeEditorComponent.changeLanguage(file.language);
        this.codeEditorComponent.code = file.content;
        this.language = file.language;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentTask'] && this.currentTask) {
      this.setupLanguage();
      this.setupInputArgs();
      this.fileSystem.initializeFromTask(this.currentTask);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Richtet die Sprache ein, basierend auf der aktuellen Aufgabe
   */
  private setupLanguage(): void {
    if (this.currentTask?.codingQuestion?.programmingLanguage) {
      this.language = this.currentTask.codingQuestion.programmingLanguage;
    }
  }

  /**
   * Richtet Eingabefelder für Argumente ein, basierend auf der aktuellen Aufgabe
   */
  private setupInputArgs(): void {
    this.argsArray.clear();
    const count = this.currentTask?.codingQuestion?.count_InputArgs || 0;

    for (let i = 0; i < count; i++) {
      this.argsArray.push(this.fb.control('', Validators.required));
    }
  }

  /**
   * Getter für das FormArray
   */
  get argsArray(): FormArray {
    return this.inputArgsForm.get('argsArray') as FormArray;
  }

  /**
   * Prüft, ob die Aufgabe Eingabeargumente benötigt
   */
  hasInputArgs(): boolean {
    return !!this.currentTask?.codingQuestion?.count_InputArgs;
  }

  /**
   * Führt aus, wenn sich der Code ändert
   */
  onCodeChanged(newCode: string): void {
    this.workspaceState.codeChanged();

    // Markiere, dass wir gerade einen lokalen Update durchführen
    this.isLocalUpdate = true;

    // Aktualisiere den Code in der aktiven Datei
    if (this.activeFile) {
      this.fileSystem.updateFileContent(this.activeFile.id, newCode);
    }

    // Timeout gibt Zeit für die Verarbeitung und verhindert Race Conditions
    setTimeout(() => {
      this.isLocalUpdate = false;
    }, 0);
  }

  /**
   * Sendet den Code zur Ausführung
   */
  submitCode(): void {
    if (!this.currentTask?.id) {
      return;
    }

    this.isSubmitting = true;

    // Signalisiere den Start der Ausführung
    this.executionStarted.emit();

    // Hole alle Dateien aus dem FileSystem
    const additionalFiles = this.fileSystem.getFilesAsRecord();

    this.workspaceState
      .executeCode(this.currentTask.id, this.argsArray.value, additionalFiles)
      .subscribe({
        next: result => {
          this.isSubmitting = false;
          this.codeSubmitted.emit(result);
        },
        error: () => {
          this.isSubmitting = false;
        },
      });
  }
}

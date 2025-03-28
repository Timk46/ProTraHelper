import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { QuestionDTO, CodeSubmissionResultDto } from '@DTOs/index';
import { CodeEditorComponent } from '../../sites/code-editor/code-editor.component';
import { WorkspaceStateService } from '../../services/workspace-state.service';

@Component({
  selector: 'app-code-editor-wrapper',
  templateUrl: './code-editor-wrapper.component.html',
  styleUrls: ['./code-editor-wrapper.component.scss']
})
export class CodeEditorWrapperComponent implements OnInit, OnChanges {
  @ViewChild('codeEditorMonaco') codeEditorComponent?: CodeEditorComponent;
  @Input() currentTask: QuestionDTO | null = null;
  @Output() codeSubmitted = new EventEmitter<CodeSubmissionResultDto>();
  @Output() executionStarted = new EventEmitter<void>();

  isSubmitting = false;
  language = 'python';

  // Form für Input-Argumente
  inputArgsForm = this.fb.group({
    argsArray: this.fb.array([])
  });

  constructor(
    private fb: FormBuilder,
    private workspaceState: WorkspaceStateService
  ) {}

  ngOnInit(): void {
    this.setupInputArgs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentTask']) {
      this.setupLanguage();
      this.setupInputArgs();
    }
  }

  /**
   * Richtet die Sprache ein, basierend auf der aktuellen Aufgabe
   */
  private setupLanguage(): void {
    if (this.currentTask?.codingQuestion?.programmingLanguage) {
      this.language = this.currentTask.codingQuestion.programmingLanguage;
      if (this.codeEditorComponent) {
        this.codeEditorComponent.changeLanguage(this.language);
      }
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
   * Liefert den initialen Code für den Editor
   */
  getInitialCode(): string {
    if (!this.currentTask?.codingQuestion?.codeGerueste?.length) {
      return '';
    }

    // In einer komplexeren Implementierung würden wir hier mehrere Dateien verwalten
    return this.currentTask.codingQuestion.codeGerueste[0].code;
  }

  /**
   * Führt aus, wenn sich der Code ändert
   */
  onCodeChanged(newCode: string): void {
    this.workspaceState.codeChanged();

    if (this.currentTask?.codingQuestion?.codeGerueste?.length) {
      // Update den Code im ersten codeGeruest
      this.currentTask.codingQuestion.codeGerueste[0].code = newCode;
    }
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

    const additionalFiles: Record<string, string> = {};
    if (this.currentTask.codingQuestion?.codeGerueste) {
      for (const file of this.currentTask.codingQuestion.codeGerueste) {
        additionalFiles[file.codeFileName] = file.code;
      }
    }

    this.workspaceState.executeCode(
      this.currentTask.id,
      this.argsArray.value,
      additionalFiles
    ).subscribe({
      next: result => {
        this.isSubmitting = false;
        this.codeSubmitted.emit(result);
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }
}

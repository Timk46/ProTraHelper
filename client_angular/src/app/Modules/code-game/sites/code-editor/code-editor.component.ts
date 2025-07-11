import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-code-editor-code-game',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.scss'],
})
export class CodeEditorComponent implements OnInit {
  @ViewChild('monacoEditor', { static: false }) monacoEditor!: any;

  @Input() selectedLanguage: string | undefined = 'c++';
  @Input() code: string = '';
  @Output() codeChange = new EventEmitter<string>();

  editorHeight: number = 600; // Default height

  // For Monaco Code Editor
  editorOptions = {
    theme: 'vs-bright',
    language: this.selectedLanguage,
    minimap: { enabled: false },
    automaticLayout: true,
  };

  ngOnInit(): void {
    this.editorOptions = {
      ...this.editorOptions,
      language: this.selectedLanguage,
    };
  }

  /**
   * Change the language of the editor.
   * @param language - The new language to set for the editor.
   */
  changeLanguage(language: string | undefined): void {
    if (language === undefined) return;
    this.selectedLanguage = language;
    this.editorOptions = {
      ...this.editorOptions,
      language: this.selectedLanguage,
    };
  }

  /**
   * Emit the new code to the parent component (student-workspace) when the code is changed.
   * @param code - The updated code from the editor.
   */
  changeCode(code: string): void {
    this.codeChange.emit(code);
  }
}

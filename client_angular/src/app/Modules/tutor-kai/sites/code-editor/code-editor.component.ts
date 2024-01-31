import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * A component that wraps the ngx-monaco-editor and provides additional functionality.
 */
@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.scss'],
})
export class CodeEditorComponent {
  @Input() selectedLanguage: string | undefined = 'java';
  @Input() code: string = '';
  @Output() codeChange = new EventEmitter<string>();

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
    console.log(language);
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

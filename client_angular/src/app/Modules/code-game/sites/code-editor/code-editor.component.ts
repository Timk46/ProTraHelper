import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.scss']
})

export class CodeEditorComponent {
  @ViewChild('monacoEditor', { static: false }) monacoEditor!: any;

  @Input() selectedLanguage: string | undefined = 'c++';
  @Input() code: string = '';
  @Output() codeChange = new EventEmitter<string>();

  editorHeight: number = 700; // Default height

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

  changeCode(code: string): void {
    this.codeChange.emit(code);
  }
}

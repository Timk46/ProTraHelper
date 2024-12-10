import { Component, ViewChild } from '@angular/core';
import { CodeEditorComponent } from "../code-editor/code-editor.component";


@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss']
})
export class WorkspaceComponent {
  @ViewChild('codeEditorMonaco') codeEditorComponent?: CodeEditorComponent;

  selectedLanguage: string = 'cpp';
  code: string = '';
  compilerOutput: string | null = '';

  onCodeChanged(newCode: string): void {
    console.log('Code changed: ', newCode);
  }

  submitCode(): void {
    this.compilerOutput = 'Compiling...';
  }
}

import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

import { CodeGameRoutingModule } from './code-game-routing.module';
import { PlayfieldComponent } from './sites/playfield/playfield.component';
import { CodeEditorComponent } from './sites/code-editor/code-editor.component';
import { WorkspaceComponent } from './sites/workspace/workspace.component';

import { MaterialModule } from '../material.module';
import { MonacoEditorModule } from "ngx-monaco-editor-v2";
import { FormsModule } from "@angular/forms";
import { MarkdownModule} from "ngx-markdown";

@NgModule({
  declarations: [
    PlayfieldComponent,
    CodeEditorComponent,
    WorkspaceComponent
  ],
  imports: [
    CommonModule,
    CodeGameRoutingModule,
    MaterialModule,
    FormsModule,
    MonacoEditorModule,
    MarkdownModule,
    NgOptimizedImage,
  ],
  exports: [
    CodeEditorComponent
  ],
})
export class CodeGameModule { }

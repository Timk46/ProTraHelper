import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CodeGameRoutingModule } from './code-game-routing.module';
import { PlayfieldComponent } from './sites/playfield/playfield.component';
import { CodeEditorComponent } from './sites/code-editor/code-editor.component';
import { WorkspaceComponent } from './sites/workspace/workspace.component';

import { MaterialModule } from '../material.module';

@NgModule({
  declarations: [
    PlayfieldComponent,
    CodeEditorComponent,
    WorkspaceComponent
  ],
  imports: [
    CommonModule,
    CodeGameRoutingModule,
    MaterialModule
  ]
})
export class CodeGameModule { }

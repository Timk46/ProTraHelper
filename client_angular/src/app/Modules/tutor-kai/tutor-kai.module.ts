import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TutorKaiRoutingModule } from './tutor-kai-routing.module';
import { TutorKaiComponent } from './tutor-kai.component';
import { StudentWorkspaceComponent } from './sites/student-workspace/student-workspace.component';

import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { ToastrModule } from 'ngx-toastr';
import { MarkdownModule } from 'ngx-markdown';

import { HttpClientModule } from '@angular/common/http';

import { MaterialModule } from '../material.module';
import { CodeEditorComponent } from './sites/code-editor/code-editor.component';
import { VideoTimeStampComponent } from './sites/video-time-stamp/video-time-stamp.component';

// Neue, optimierte Komponenten
import { RatingComponent } from './components/rating/rating.component';
import { FeedbackPanelComponent } from './components/feedback-panel/feedback-panel.component';
import { CodeEditorWrapperComponent } from './components/code-editor-wrapper/code-editor-wrapper.component';
import { TerminalOutputComponent } from './components/terminal-output/terminal-output.component';
import { TestIndicatorsComponent } from './components/test-indicators/test-indicators.component';
import { TestDetailsDialogComponent } from './components/test-indicators/test-details-dialog/test-details-dialog.component';
import { EditorTabsComponent } from './components/editor-tabs/editor-tabs.component';
import { FileExplorerComponent } from './components/file-explorer/file-explorer.component';

// Services
import { WorkspaceStateService } from './services/workspace-state.service';
import { FileSystemService } from './services/file-system.service';

@NgModule({
  declarations: [
    TutorKaiComponent,
    StudentWorkspaceComponent,
    CodeEditorComponent,
    VideoTimeStampComponent,
    // Neue Komponenten
    RatingComponent,
    FeedbackPanelComponent,
    CodeEditorWrapperComponent,
    TerminalOutputComponent,
    TestIndicatorsComponent,
    TestDetailsDialogComponent,
    EditorTabsComponent,
    FileExplorerComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    MaterialModule,
    TutorKaiRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    MarkdownModule.forRoot(),
    ToastrModule.forRoot(),
    MonacoEditorModule.forRoot()
  ],
  exports: [
    CodeEditorComponent,
    VideoTimeStampComponent,
    // Neue Komponenten als Export hinzufügen, falls sie außerhalb des Moduls verwendet werden
    RatingComponent,
    FeedbackPanelComponent,
    CodeEditorWrapperComponent,
    TerminalOutputComponent,
    TestIndicatorsComponent,
    EditorTabsComponent,
    FileExplorerComponent
  ],
  providers: [
    WorkspaceStateService, // Explizite Bereitstellung des State Services
    FileSystemService
  ],
  bootstrap: [TutorKaiComponent],
})
export class TutorKaiModule {}

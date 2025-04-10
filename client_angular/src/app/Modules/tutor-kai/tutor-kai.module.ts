import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Routing
import { TutorKaiRoutingModule } from './tutor-kai-routing.module';

// Components
import { TutorKaiComponent } from './tutor-kai.component';
import { StudentWorkspaceComponent } from './sites/student-workspace/student-workspace.component';
import { CodeEditorComponent } from './sites/code-editor/code-editor.component';
import { VideoTimeStampComponent } from './sites/video-time-stamp/video-time-stamp.component';
import { RatingComponent } from './components/rating/rating.component';
import { FeedbackPanelComponent } from './components/feedback-panel/feedback-panel.component';
import { CodeEditorWrapperComponent } from './components/code-editor-wrapper/code-editor-wrapper.component';
import { TerminalOutputComponent } from './components/terminal-output/terminal-output.component';
import { TestIndicatorsComponent } from './components/test-indicators/test-indicators.component';
import { TestDetailsDialogComponent } from './components/test-indicators/test-details-dialog/test-details-dialog.component';
import { EditorTabsComponent } from './components/editor-tabs/editor-tabs.component';
import { FileExplorerComponent } from './components/file-explorer/file-explorer.component';

import { FeedbackPanelTutorFeedbackComponent } from './components/feedback-panel-tutor-feedback/feedback-panel-tutor-feedback.component';
import { FeedbackHintConfirmationDialogComponent } from './components/feedback-panel-tutor-feedback/feedback-hint-confirmation-dialog/feedback-hint-confirmation-dialog.component';
// Modules
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { ToastrModule } from 'ngx-toastr';
import { MarkdownModule } from 'ngx-markdown';
import { MaterialModule } from '../material.module';

// Services
import { WorkspaceStateService } from './services/workspace-state.service';
import { FileSystemService } from './services/file-system.service';

@NgModule({
  declarations: [
    TutorKaiComponent,
    StudentWorkspaceComponent,
    CodeEditorComponent,
    VideoTimeStampComponent,
    RatingComponent,
    FeedbackPanelComponent,
    CodeEditorWrapperComponent,
    TerminalOutputComponent,
    TestIndicatorsComponent,
    TestDetailsDialogComponent,
    EditorTabsComponent,
    FileExplorerComponent,
    FeedbackPanelTutorFeedbackComponent,
    FeedbackHintConfirmationDialogComponent,
  ],
  imports: [
    CommonModule,
    TutorKaiRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    MarkdownModule.forRoot(),
    ToastrModule.forRoot(),
    MonacoEditorModule.forRoot()
  ],
  exports: [
    CodeEditorComponent,
    VideoTimeStampComponent,
    RatingComponent,
    FeedbackPanelComponent,
    CodeEditorWrapperComponent,
    TerminalOutputComponent,
    TestIndicatorsComponent,
    EditorTabsComponent,
    FileExplorerComponent,
    FeedbackPanelTutorFeedbackComponent,
  ],
  providers: [
    WorkspaceStateService,
    FileSystemService
  ]
})
export class TutorKaiModule {}

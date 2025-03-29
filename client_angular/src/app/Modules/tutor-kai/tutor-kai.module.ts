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

import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { MaterialModule } from '../material.module';
import { CodeEditorComponent } from './sites/code-editor/code-editor.component';
import { VideoTimeStampComponent } from './sites/video-time-stamp/video-time-stamp.component';

@NgModule({ declarations: [
        TutorKaiComponent,
        StudentWorkspaceComponent,
        CodeEditorComponent,
        VideoTimeStampComponent
    ],
    exports: [
        CodeEditorComponent,
        VideoTimeStampComponent
    ],
    bootstrap: [TutorKaiComponent], imports: [CommonModule,
        MaterialModule,
        TutorKaiRoutingModule,
        ReactiveFormsModule,
        FormsModule,
        MarkdownModule.forRoot(),
        ToastrModule.forRoot(),
        MonacoEditorModule.forRoot()], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class TutorKaiModule {}

import "reflect-metadata"
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MaterialModule } from './Modules/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Components
import { GraphComponent } from './Pages/graph/graph.component';
import { ContentBoardComponent } from './Pages/contentBoard/contentBoard.component';
import { DashboardComponent } from './Pages/dashboard/dashboard.component';
import { ConceptOverviewComponent } from './Pages/conceptOverview/conceptOverview.component';
import { CodeTaskComponent } from './Pages/contentView/contentElement/codeTask/codeTask.component';
import { PdfViewerComponent } from './Pages/contentView/contentElement/pdfViewer/pdfViewer.component';
import { McTaskComponent } from './Pages/contentView/contentElement/mcTask/mcTask.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { HTTP_INTERCEPTORS, HttpClientModule } from "@angular/common/http";
import { FileUploadComponent } from './Pages/test/file-upload/file-upload.component';
import { ContentViewComponent } from './Pages/contentView/contentView.component';
import { CreateConceptDialogComponent } from './Pages/graph/graph-dialogs/create-concept-dialog/create-concept-dialog.component';
import { VideoViewerComponent } from './Pages/contentView/contentElement/videoViewer/videoViewer.component';
import { CompetenciesComponent } from './Pages/competencies/competencies.component';
import { ChatBotComponent } from './Pages/chat-bot/chat-bot.component';
import { ChatBotDialogComponent } from './Pages/chat-bot/chat-bot-dialog/chat-bot-dialog.component';
import { VideoTimeStampComponent } from './Pages/chat-bot/video-time-stamp/video-time-stamp.component';
import { LoginComponent } from './Pages/login/login.component';
import { AuthInterceptor } from "./Services/auth/auth-interceptor.service";
import { LoggedInGuard } from "./Guards/is-logged-in.guard";
import { TinymceComponent } from './Pages/tinymce/tinymce.component';
import { EditorModule, TINYMCE_SCRIPT_SRC } from "@tinymce/tinymce-angular";
import { DiscussionListComponent } from './Pages/discussion/discussion-list/discussion-list.component';
import { DiscussionViewComponent } from './Pages/discussion/discussion-view/discussion-view.component';
import { DiscussionFilterComponent } from './Pages/discussion/discussion-list/discussion-filter/discussion-filter.component';
import { DiscussionListItemComponent } from './Pages/discussion/discussion-list/discussion-list-item/discussion-list-item.component';
import { DiscussionVoteboxComponent } from './Pages/discussion/discussion-votebox/discussion-votebox.component';
import { DiscussionViewQuestionComponent } from './Pages/discussion/discussion-view/discussion-view-question/discussion-view-question.component';
import { DiscussionViewMessageComponent } from './Pages/discussion/discussion-view/discussion-view-message/discussion-view-message.component';
import { DiscussionViewCreateComponent } from './Pages/discussion/discussion-view/discussion-view-create/discussion-view-create.component';
import { DiscussionCreationComponent } from './Pages/discussion/discussion-creation/discussion-creation.component';
import { DiscussionPrecreationComponent } from './Pages/discussion/discussion-creation/discussion-precreation/discussion-precreation.component';
import { TaskOverviewComponent } from './Pages/task-overview/task-overview.component';
import { MatBadgeModule } from '@angular/material/badge';
import {ProgressBarMode, MatProgressBarModule, MatProgressBar} from '@angular/material/progress-bar';
import { TaskEvaluationOverviewComponent } from './Pages/task-evaluation-overview/task-evaluation-overview.component';
import { FreeTextTaskComponent } from './Pages/contentView/contentElement/free-text-task/free-text-task.component';



@NgModule({
  declarations: [
    AppComponent,
    ContentBoardComponent,
    DashboardComponent,
    ConceptOverviewComponent,
    CodeTaskComponent,
    PdfViewerComponent,
    McTaskComponent,
    GraphComponent,
    FileUploadComponent,
    ContentViewComponent,
    CreateConceptDialogComponent,
    VideoViewerComponent,
    CompetenciesComponent,
    ChatBotComponent, ChatBotDialogComponent, VideoTimeStampComponent, LoginComponent,
    TinymceComponent,
    DiscussionListComponent,
    DiscussionViewComponent,
    DiscussionFilterComponent,
    DiscussionListItemComponent,
    DiscussionVoteboxComponent,
    DiscussionViewQuestionComponent,
    DiscussionViewMessageComponent,
    DiscussionViewCreateComponent,
    DiscussionCreationComponent,
    DiscussionPrecreationComponent,
    TaskOverviewComponent,
    TaskEvaluationOverviewComponent,
    FreeTextTaskComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MaterialModule,
    NgxExtendedPdfViewerModule,
    HttpClientModule,
    MatProgressBarModule,
    MatBadgeModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: TINYMCE_SCRIPT_SRC, useValue: 'tinymce/tinymce.min.js' },
    LoggedInGuard,
    EditorModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

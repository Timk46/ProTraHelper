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
import { McQuizComponent } from './Pages/contentView/contentElement/mcQuiz/mcQuiz.component';
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
import { DiscussionListComponent } from './Pages/Discussion/discussion-list/discussion-list.component';
import { DiscussionViewComponent } from './Pages/Discussion/discussion-view/discussion-view.component';
import { DiscussionFilterComponent } from './Pages/Discussion/discussion-list/discussion-filter/discussion-filter.component';
import { DiscussionListItemComponent } from './Pages/Discussion/discussion-list/discussion-list-item/discussion-list-item.component';
import { DiscussionVoteboxComponent } from './Pages/Discussion/discussion-votebox/discussion-votebox.component';
import { DiscussionViewQuestionComponent } from './Pages/Discussion/discussion-view/discussion-view-question/discussion-view-question.component';
import { DiscussionViewMessageComponent } from './Pages/Discussion/discussion-view/discussion-view-message/discussion-view-message.component';
import { DiscussionViewCreateComponent } from './Pages/Discussion/discussion-view/discussion-view-create/discussion-view-create.component';
import { DiscussionCreationComponent } from './Pages/Discussion/discussion-creation/discussion-creation.component';
import { DiscussionPrecreationComponent } from './Pages/Discussion/discussion-creation/discussion-precreation/discussion-precreation.component';



@NgModule({
  declarations: [
    AppComponent,
    ContentBoardComponent,
    DashboardComponent,
    ConceptOverviewComponent,
    CodeTaskComponent,
    PdfViewerComponent,
    McQuizComponent,
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

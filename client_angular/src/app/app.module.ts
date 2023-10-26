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
import { DiscussionComponent } from './Pages/discussion/discussion.component';
import { CodeTaskComponent } from './Pages/contentView/contentElement/codeTask/codeTask.component';
import { PdfViewerComponent } from './Pages/contentView/contentElement/pdfViewer/pdfViewer.component';
import { McQuizComponent } from './Pages/contentView/contentElement/mcQuiz/mcQuiz.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { HttpClient, HttpClientModule } from "@angular/common/http";
import { FileUploadComponent } from './Pages/test/file-upload/file-upload.component';
import { ContentViewComponent } from './Pages/contentView/contentView.component';
import { CreateConceptDialogComponent } from './Pages/graph/graph-dialogs/create-concept-dialog/create-concept-dialog.component';
import { VideoViewerComponent } from './Pages/contentView/contentElement/videoViewer/videoViewer.component';
import { CompetenciesComponent } from './Pages/competencies/competencies.component';
import { DiscussionFilterComponent } from './Pages/discussion/discussion-filter/discussion-filter.component';
import { DiscussionListComponent } from './Pages/discussion/discussion-list/discussion-list.component';
import { QuestionComponent } from './Pages/discussion/discussion-list/question/question.component';
import { VoteBoxComponent } from './Pages/discussion/vote-box/vote-box.component';
import { FilterMenuComponent } from './Pages/discussion/discussion-filter/filter-menu/filter-menu.component';
import { DiscussionPageComponent } from './Pages/discussion/discussion-page/discussion-page.component';
import { DiscussionCreationComponent } from './Pages/discussion/discussion-creation/discussion-creation.component';
import { DiscussionPageQuestionComponent } from './Pages/discussion/discussion-page/discussion-page-question/discussion-page-question.component';
import { DiscussionPageCommentComponent } from './Pages/discussion/discussion-page/discussion-page-comment/discussion-page-comment.component';
import { CommentCreationComponent } from './Pages/discussion/discussion-page/comment-creation/comment-creation.component';
import { CreationDialogComponent } from './Pages/discussion/creation-dialog/creation-dialog.component';



@NgModule({
  declarations: [
    AppComponent,
    ContentBoardComponent,
    DashboardComponent,
    ConceptOverviewComponent,
    DiscussionComponent,
    CodeTaskComponent,
    PdfViewerComponent,
    McQuizComponent,
    GraphComponent,
    FileUploadComponent,
    ContentViewComponent,
    CreateConceptDialogComponent,
    VideoViewerComponent,
    CompetenciesComponent,
    DiscussionFilterComponent,
    DiscussionListComponent,
    QuestionComponent,
    VoteBoxComponent,
    FilterMenuComponent,
    DiscussionPageComponent,
    DiscussionCreationComponent,
    DiscussionPageQuestionComponent,
    DiscussionPageCommentComponent,
    CommentCreationComponent,
    CreationDialogComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MaterialModule,
    NgxExtendedPdfViewerModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

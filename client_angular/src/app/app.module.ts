import "reflect-metadata"
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MaterialModule } from './Modules/material.module';
import { FormsModule } from '@angular/forms';
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
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { HttpClient, HttpClientModule } from "@angular/common/http";
import { FileUploadComponent } from './Pages/test/file-upload/file-upload.component';
import { ContentViewComponent } from './Pages/contentView/contentView.component';



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
    ContentViewComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MaterialModule,
    PdfViewerModule,
    NgxExtendedPdfViewerModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

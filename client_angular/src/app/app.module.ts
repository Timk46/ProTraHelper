import "reflect-metadata"
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MaterialModule } from './Modules/material.module';
import { FormsModule } from '@angular/forms';
// Components
import { GraphComponent } from './Pages/graph/graph.component';
import { ContentComponent } from './Pages/content/content.component';
import { DashboardComponent } from './Pages/dashboard/dashboard.component';
import { ContentOverviewComponent } from './Pages/contentOverview/contentOverview.component';
import { DiscussionComponent } from './Pages/discussion/discussion.component';
import { CodeTaskComponent } from './Pages/content/codeTask/codeTask.component';
import { InstructionComponent } from './Pages/content/instruction/instruction.component';
import { McQuizComponent } from './Pages/content/mcQuiz/mcQuiz.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { HttpClient, HttpClientModule } from "@angular/common/http";
import { FileUploadComponent } from './Pages/test/file-upload/file-upload.component';



@NgModule({
  declarations: [
    AppComponent,
    ContentComponent,
    DashboardComponent,
    ContentOverviewComponent,
    DiscussionComponent,
    CodeTaskComponent,
    InstructionComponent,
    McQuizComponent,
    GraphComponent,
    FileUploadComponent
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

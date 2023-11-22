import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContentBoardComponent } from './Pages/contentBoard/contentBoard.component';
import { AppComponent } from './app.component';
import { DashboardComponent } from './Pages/dashboard/dashboard.component';
import { ConceptOverviewComponent } from './Pages/conceptOverview/conceptOverview.component';
import { CodeTaskComponent } from './Pages/contentView/contentElement/codeTask/codeTask.component';
import { PdfViewerComponent } from './Pages/contentView/contentElement/pdfViewer/pdfViewer.component';
import { McQuizComponent } from './Pages/contentView/contentElement/mcQuiz/mcQuiz.component';
import { GraphComponent } from './Pages/graph/graph.component';
import { DiscussionViewComponent } from './Pages/Discussion/discussion-view/discussion-view.component';

// just for testing
import { FileUploadComponent } from './Pages/test/file-upload/file-upload.component';



const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'app', component: AppComponent },
  { path: 'contentBoard', component: ContentBoardComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'conceptOverview', component: ConceptOverviewComponent },
  { path: 'codeTask', component: CodeTaskComponent },
  { path: 'pdfViewer/:uniqueIdentifier', component: PdfViewerComponent },
  { path: 'mcQuiz', component: McQuizComponent },
  { path: 'graph', component: GraphComponent },
  { path: 'discussion-view/:discussionId', component: DiscussionViewComponent },

  // just for testing
  { path: 'file-upload', component: FileUploadComponent },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

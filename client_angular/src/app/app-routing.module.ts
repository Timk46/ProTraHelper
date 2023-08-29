import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContentBoardComponent } from './Pages/contentBoard/contentBoard.component';
import { AppComponent } from './app.component';
import { DashboardComponent } from './Pages/dashboard/dashboard.component';
import { ConceptOverviewComponent } from './Pages/conceptOverview/conceptOverview.component';
import { DiscussionComponent } from './Pages/discussion/discussion.component';
import { CodeTaskComponent } from './Pages/contentBoard/codeTask/codeTask.component';
import { PdfViewerComponent } from './Pages/contentBoard/pdfViewer/pdfViewer.component';
import { McQuizComponent } from './Pages/contentBoard/mcQuiz/mcQuiz.component';
import { GraphComponent } from './Pages/graph/graph.component';

// just for testing
import { FileUploadComponent } from './Pages/test/file-upload/file-upload.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'app', component: AppComponent },
  { path: 'contentBoard', component: ContentBoardComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'conceptOverview', component: ConceptOverviewComponent },
  { path: 'discussion', component: DiscussionComponent },
  { path: 'codeTask', component: CodeTaskComponent },
  { path: 'pdfViewer/:uniqueIdentifier', component: PdfViewerComponent },
  { path: 'mcQuiz', component: McQuizComponent },
  { path: 'graph', component: GraphComponent },

  // just for testing
  { path: 'file-upload', component: FileUploadComponent },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

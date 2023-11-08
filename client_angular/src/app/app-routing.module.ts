import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContentBoardComponent } from './Pages/contentBoard/contentBoard.component';
import { AppComponent } from './app.component';
import { DashboardComponent } from './Pages/dashboard/dashboard.component';
import { ConceptOverviewComponent } from './Pages/conceptOverview/conceptOverview.component';
import { DiscussionComponent } from './Pages/discussion/discussion.component';
import { CodeTaskComponent } from './Pages/contentView/contentElement/codeTask/codeTask.component';
import { PdfViewerComponent } from './Pages/contentView/contentElement/pdfViewer/pdfViewer.component';
import { McQuizComponent } from './Pages/contentView/contentElement/mcQuiz/mcQuiz.component';
import { GraphComponent } from './Pages/graph/graph.component';
import { ChatBotComponent } from './Pages/chat-bot/chat-bot.component';

// just for testing
import { FileUploadComponent } from './Pages/test/file-upload/file-upload.component';
import { DiscussionPageComponent } from './Pages/discussion/discussion-page/discussion-page.component';

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
  { path: 'chatbot', component: ChatBotComponent },

  // just for testing
  { path: 'file-upload', component: FileUploadComponent },
  { path: 'discussion-page', component: DiscussionPageComponent },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

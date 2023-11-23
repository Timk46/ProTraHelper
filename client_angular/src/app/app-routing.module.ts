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
import { ChatBotComponent } from './Pages/chat-bot/chat-bot.component';
import { VideoTimeStampComponent } from './Pages/chat-bot/video-time-stamp/video-time-stamp.component';
import { DiscussionViewComponent } from './Pages/Discussion/discussion-view/discussion-view.component';
import { DiscussionListComponent } from './Pages/Discussion/discussion-list/discussion-list.component';
// just for testing
import { FileUploadComponent } from './Pages/test/file-upload/file-upload.component';
import { LoginComponent } from './Pages/login/login.component';
import { LoggedInGuard } from './Guards/is-logged-in.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'app', component: AppComponent,},
  { path: 'contentBoard', component: ContentBoardComponent, canActivate: [LoggedInGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [LoggedInGuard] },
  { path: 'conceptOverview', component: ConceptOverviewComponent, canActivate: [LoggedInGuard] },
  { path: 'discussion', component: DiscussionListComponent, canActivate: [LoggedInGuard] },
  { path: 'codeTask', component: CodeTaskComponent, canActivate: [LoggedInGuard] },
  { path: 'pdfViewer/:uniqueIdentifier', component: PdfViewerComponent, canActivate: [LoggedInGuard] },
  { path: 'mcQuiz', component: McQuizComponent, canActivate: [LoggedInGuard] },
  { path: 'graph', component: GraphComponent, canActivate: [LoggedInGuard] },
  { path: 'chatbot', component: ChatBotComponent, canActivate: [LoggedInGuard] },
  { path: 'video', component: VideoTimeStampComponent, canActivate: [LoggedInGuard] },
  { path: 'discussion-view/:discussionId', component: DiscussionViewComponent, canActivate: [LoggedInGuard] },

  // just for testing
  { path: 'file-upload', component: FileUploadComponent, canActivate: [LoggedInGuard] },

];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

import { NgModule } from '@angular/core';
import { RouterModule, Routes, PreloadAllModules } from '@angular/router';
import { ContentBoardComponent } from './Pages/contentBoard/contentBoard.component';
import { AppComponent } from './app.component';
import { DashboardComponent } from './Pages/dashboard/dashboard.component';
import { ConceptOverviewComponent } from './Pages/conceptOverview/conceptOverview.component';
import { CodeTaskComponent } from './Pages/contentView/contentElement/codeTask/codeTask.component';
import { PdfViewerComponent } from './Pages/contentView/contentElement/pdfViewer/pdfViewer.component';
import { McTaskComponent } from './Pages/contentView/contentElement/mcTask/mcTask.component';
import { GraphComponent } from './Pages/graph/graph.component';
import { ChatBotComponent } from './Pages/chat-bot/chat-bot.component';
import { VideoTimeStampComponent } from './Pages/chat-bot/video-time-stamp/video-time-stamp.component';
import { DiscussionViewComponent } from './Pages/discussion/discussion-view/discussion-view.component';
import { DiscussionListComponent } from './Pages/discussion/discussion-list/discussion-list.component';
// just for testing
import { FileUploadComponent } from './Pages/test/file-upload/file-upload.component';
import { LoginComponent } from './Pages/login/login.component';
import { LoggedInGuard } from './Guards/is-logged-in.guard';
import { TaskEvaluationOverviewComponent } from './Pages/task-evaluation-overview/task-evaluation-overview.component';
import { EditFreetextComponent } from './Pages/lecturersView/edit-freetext/edit-freetext.component';
import { EditChoiceComponent } from './Pages/lecturersView/edit-choice/edit-choice.component';
import { EditCodingComponent } from './Pages/lecturersView/edit-coding/edit-coding.component';
import { EditGraphComponent } from './Pages/lecturersView/edit-graph/edit-graph.component';
import { EditFillinComponent } from './Pages/lecturersView/edit-fillin/edit-fillin.component';
import { AdminGuard } from './Guards/is-admin.guard';
import { McTaskCreationComponent } from './Pages/contentView/contentElement/mc-task-creation/mc-task-creation.component';
import { GraphTasksComponent } from './Modules/graph-tasks/graph-tasks.component';

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
  { path: 'mcTask', component: McTaskComponent, canActivate: [LoggedInGuard] },
  { path: 'graph', component: GraphComponent, canActivate: [LoggedInGuard] },
  { path: 'chatbot', component: ChatBotComponent, canActivate: [LoggedInGuard] },
  { path: 'video', component: VideoTimeStampComponent, canActivate: [LoggedInGuard] },
  { path: 'discussion-view/:discussionId', component: DiscussionViewComponent, canActivate: [LoggedInGuard] },
  { path: 'task-evaluation-overview', component: TaskEvaluationOverviewComponent },

  { path: 'mcqcreation', component: McTaskCreationComponent, canActivate: [LoggedInGuard]},

  // lecturers view
  { path: 'editchoice/:questionId', component: EditChoiceComponent, canActivate: [LoggedInGuard, AdminGuard]},
  { path: 'editcoding/:questionId', component: EditCodingComponent, canActivate: [LoggedInGuard, AdminGuard]},
  { path: 'editfillin/:questionId', component: EditFillinComponent, canActivate: [LoggedInGuard, AdminGuard]},
  { path: 'editfreetext/:questionId', component: EditFreetextComponent, canActivate: [LoggedInGuard, AdminGuard]},
  { path: 'editgraph/:questionId', component: EditGraphComponent, canActivate: [LoggedInGuard, AdminGuard]},

  // just for testing
  { path: 'file-upload', component: FileUploadComponent, canActivate: [LoggedInGuard] },

  { path: 'graphtask', component: GraphTasksComponent, canActivate: [LoggedInGuard]},

  // Tutor-Kai as lazy loaded module (https://medium.com/@jaydeepvpatil225/feature-module-with-lazy-loading-in-angular-15-53bb8e15d193) Maybe we can use the same for UML Tasks?
  { path: 'tutor-kai', loadChildren: () => import('./Modules/tutor-kai/tutor-kai.module').then(m => m.TutorKaiModule) },

];
@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule { }

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

import { NotRegisteredComponent } from './Pages/not-registered/not-registered.component';
import { RegisteredForSubjectGuard } from './Guards/registered-for-subject.guard';

import { GraphTasksComponent } from './Modules/graph-tasks/graph-tasks.component';


const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'app', component: AppComponent },
  { path: 'not-registered', component: NotRegisteredComponent, canActivate: [LoggedInGuard] },
  { path: 'contentBoard', component: ContentBoardComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },
  { path: 'conceptOverview', component: ConceptOverviewComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },
  { path: 'discussion', component: DiscussionListComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },
  { path: 'codeTask', component: CodeTaskComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },
  { path: 'pdfViewer/:uniqueIdentifier', component: PdfViewerComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },
  { path: 'mcTask', component: McTaskComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },
  { path: 'graph', component: GraphComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },
  { path: 'chatbot', component: ChatBotComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },
  { path: 'video', component: VideoTimeStampComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },
  { path: 'discussion-view/:discussionId', component: DiscussionViewComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },
  { path: 'task-evaluation-overview', component: TaskEvaluationOverviewComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },

  { path: 'mcqcreation', component: McTaskCreationComponent, canActivate: [LoggedInGuard, RegisteredForSubjectGuard]},

  // lecturers view
  { path: 'editchoice/:questionId', component: EditChoiceComponent, canActivate: [LoggedInGuard, AdminGuard]},
  { path: 'editcoding/:questionId', component: EditCodingComponent, canActivate: [LoggedInGuard, AdminGuard]},
  { path: 'editfillin/:questionId', component: EditFillinComponent, canActivate: [LoggedInGuard, AdminGuard]},
  { path: 'editfreetext/:questionId', component: EditFreetextComponent, canActivate: [LoggedInGuard, AdminGuard]},
  { path: 'editgraph/:questionId', component: EditGraphComponent, canActivate: [LoggedInGuard, AdminGuard]},

  // just for testing
  { path: 'file-upload', component: FileUploadComponent, canActivate: [LoggedInGuard] },

  { path: 'graphtask/:questionId', component: GraphTasksComponent, canActivate: [LoggedInGuard]},

  // Tutor-Kai as lazy loaded module (https://medium.com/@jaydeepvpatil225/feature-module-with-lazy-loading-in-angular-15-53bb8e15d193) Maybe we can use the same for UML Tasks?
  { path: 'tutor-kai', loadChildren: () => import('./Modules/tutor-kai/tutor-kai.module').then(m => m.TutorKaiModule), canActivate: [LoggedInGuard, RegisteredForSubjectGuard] },

  { path: 'admin', loadChildren: () => import('./Pages/admin/admin.module').then(m => m.AdminModule), canActivate: [LoggedInGuard, AdminGuard] },
];
@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule { }

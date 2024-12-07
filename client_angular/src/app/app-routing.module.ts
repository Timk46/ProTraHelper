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

// refactor that routes with dashboard as parent component and the rest as children

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'app', component: AppComponent },
  { path: 'not-registered', component: NotRegisteredComponent, canActivate: [LoggedInGuard] },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
    children: [
      { path: 'contentBoard', component: ContentBoardComponent },
      { path: 'conceptOverview', component: ConceptOverviewComponent },
      { path: 'conceptOverview/:conceptId', component: ConceptOverviewComponent },
      { path: 'conceptOverview/:conceptId/question/:questionId', component: ConceptOverviewComponent },
      { path: 'discussion', component: DiscussionListComponent },
      { path: 'codeTask', component: CodeTaskComponent },
      { path: 'pdfViewer/:uniqueIdentifier', component: PdfViewerComponent },
      { path: 'mcTask', component: McTaskComponent },
      { path: 'graph', component: GraphComponent },
      { path: 'chatbot', component: ChatBotComponent },
      { path: 'video', component: VideoTimeStampComponent },
      { path: 'discussion-view/:discussionId', component: DiscussionViewComponent },
      { path: 'task-evaluation-overview', component: TaskEvaluationOverviewComponent },
      { path: 'mcqcreation', component: McTaskCreationComponent },

      // lecturers view
      { path: 'editchoice/:questionId', component: EditChoiceComponent, canActivate: [AdminGuard] },
      { path: 'editcoding/:questionId', component: EditCodingComponent, canActivate: [AdminGuard] },
      { path: 'editfillin/:questionId', component: EditFillinComponent, canActivate: [AdminGuard] },
      { path: 'editfreetext/:questionId', component: EditFreetextComponent, canActivate: [AdminGuard] },
      { path: 'editgraph/:questionId', component: EditGraphComponent, canActivate: [AdminGuard] },

      // just for testing
      { path: 'file-upload', component: FileUploadComponent },

      { path: 'graphtask/:questionId', component: GraphTasksComponent },

      // Lazy loaded modules
      {
        path: 'tutor-kai',
        loadChildren: () => import('./Modules/tutor-kai/tutor-kai.module').then(m => m.TutorKaiModule)
      },
      {
        path: 'admin',
        loadChildren: () => import('./Pages/admin/admin.module').then(m => m.AdminModule),
        canActivate: [AdminGuard]
      }
    ]
  }
];
@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule { }

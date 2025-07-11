import { NgModule } from '@angular/core';
import type { Routes } from '@angular/router';
import { RouterModule } from '@angular/router';
import { ContentBoardComponent } from './Pages/contentBoard/contentBoard.component';
import { AppComponent } from './app.component';
import { DashboardComponent } from './Pages/dashboard/dashboard.component';
import { ConceptOverviewComponent } from './Pages/conceptOverview/conceptOverview.component';
import { CodeTaskComponent } from './Pages/contentView/contentElement/codeTask/codeTask.component';
import { PdfViewerComponent } from './Pages/contentView/contentElement/pdfViewer/pdfViewer.component';
import { GraphComponent } from './Pages/graph/graph.component';
import { MobileNavigatorComponent } from './Pages/mobile-navigator/mobile-navigator.component';
import { HighlightNavigatorComponent } from './Pages/highlight-navigator/highlight-navigator.component';
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
import { NavigationPreferenceGuard } from './Guards/navigation-preference.guard';
import { GraphTasksComponent } from './Modules/graph-tasks/graph-tasks.component';
import { DynamicQuestionComponent } from './Pages/dynamic-question/dynamic-question.component';
import { EditUmlComponent } from './Pages/lecturersView/edit-uml/edit-uml.component';
import { EditCodeGameComponent } from './Pages/lecturersView/edit-code-game/edit-code-game.component';

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
      {
        path: 'contentBoard',
        component: ContentBoardComponent,
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
      },
      {
        path: 'concept',
        component: ConceptOverviewComponent,
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
      },
      {
        path: 'concept/:conceptId',
        component: ConceptOverviewComponent,
        children: [
          {
            path: 'question/:questionId',
            component: DynamicQuestionComponent,
            canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
          },
        ],
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
      },
      {
        path: 'discussion',
        component: DiscussionListComponent,
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
      },
      {
        path: 'codeTask',
        component: CodeTaskComponent,
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
      },
      {
        path: 'pdfViewer/:uniqueIdentifier',
        component: PdfViewerComponent,
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
      },
      {
        path: 'graph',
        component: GraphComponent,
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard, NavigationPreferenceGuard],
      },
      {
        path: 'mobile-navigator',
        component: MobileNavigatorComponent,
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard, NavigationPreferenceGuard],
      },
      {
        path: 'highlight-navigator',
        component: HighlightNavigatorComponent,
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard, NavigationPreferenceGuard],
      },
      {
        path: 'chatbot',
        component: ChatBotComponent,
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
      },
      {
        path: 'video',
        component: VideoTimeStampComponent,
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
      },
      {
        path: 'task-evaluation-overview',
        component: TaskEvaluationOverviewComponent,
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
      },
      {
        path: 'mcqcreation',
        component: McTaskCreationComponent,
        canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
      },
      // lecturers view
      {
        path: 'editchoice/:questionId',
        component: EditChoiceComponent,
        canActivate: [LoggedInGuard, AdminGuard],
      },
      {
        path: 'editcoding/:questionId',
        component: EditCodingComponent,
        canActivate: [LoggedInGuard, AdminGuard],
      },
      {
        path: 'editfillin/:questionId',
        component: EditFillinComponent,
        canActivate: [LoggedInGuard, AdminGuard],
      },
      {
        path: 'editfreetext/:questionId',
        component: EditFreetextComponent,
        canActivate: [LoggedInGuard, AdminGuard],
      },
      {
        path: 'editgraph/:questionId',
        component: EditGraphComponent,
        canActivate: [LoggedInGuard, AdminGuard],
      },
      // just for testing
      { path: 'file-upload', component: FileUploadComponent, canActivate: [LoggedInGuard] },
    ],
  },
  {
    path: 'discussion-view/:discussionId',
    component: DiscussionViewComponent,
    canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
  },
  {
    path: 'task-evaluation-overview',
    component: TaskEvaluationOverviewComponent,
    canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
  },

  {
    path: 'mcqcreation',
    component: McTaskCreationComponent,
    canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
  },

  // lecturers view
  {
    path: 'editchoice/:questionId',
    component: EditChoiceComponent,
    canActivate: [LoggedInGuard, AdminGuard],
  },
  {
    path: 'editcoding/:questionId',
    component: EditCodingComponent,
    canActivate: [LoggedInGuard, AdminGuard],
  },
  {
    path: 'editfillin/:questionId',
    component: EditFillinComponent,
    canActivate: [LoggedInGuard, AdminGuard],
  },
  {
    path: 'editfreetext/:questionId',
    component: EditFreetextComponent,
    canActivate: [LoggedInGuard, AdminGuard],
  },
  {
    path: 'editgraph/:questionId',
    component: EditGraphComponent,
    canActivate: [LoggedInGuard, AdminGuard],
  },
  {
    path: 'edituml/:questionId',
    component: EditUmlComponent,
    canActivate: [LoggedInGuard, AdminGuard],
  },
  {
    path: 'editcodegame/:questionId',
    component: EditCodeGameComponent,
    canActivate: [LoggedInGuard, AdminGuard],
  },

  // just for testing
  { path: 'file-upload', component: FileUploadComponent, canActivate: [LoggedInGuard] },

  { path: 'graphtask/:questionId', component: GraphTasksComponent, canActivate: [LoggedInGuard] },

  // Tutor-Kai as lazy loaded module (https://medium.com/@jaydeepvpatil225/feature-module-with-lazy-loading-in-angular-15-53bb8e15d193) Maybe we can use the same for UML Tasks?
  {
    path: 'tutor-kai',
    loadChildren: () => import('./Modules/tutor-kai/tutor-kai.module').then(m => m.TutorKaiModule),
    canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
  },
  // UMLearn as lazy loaded module
  {
    path: 'umlearn',
    loadChildren: () => import('./Modules/umlearn/umlearn.module').then(m => m.UmlearnModule),
    canActivate: [LoggedInGuard, RegisteredForSubjectGuard],
  },

  {
    path: 'admin',
    loadChildren: () => import('./Pages/admin/admin.module').then(m => m.AdminModule),
    canActivate: [LoggedInGuard, AdminGuard],
  },
  {
    path: 'teacher',
    loadChildren: () => import('./Pages/teacher/teacher.module').then(m => m.TeacherModule),
    canActivate: [LoggedInGuard], // Assuming teachers need to be logged in
  },
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      // preloadingStrategy: PreloadAllModules, // PreloadAllModules needs to be imported if used. Removing for now to fix immediate error.
      paramsInheritanceStrategy: 'emptyOnly', // Default in Angular 17
      // Add other router configuration options that are no longer part of the public API
      scrollPositionRestoration: 'disabled', // Default value
      anchorScrolling: 'disabled', // Default value
      onSameUrlNavigation: 'ignore', // Default value
      enableTracing: false, // Default value
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}

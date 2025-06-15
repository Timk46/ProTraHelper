import "reflect-metadata"
import { NgModule} from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { MaterialModule } from './Modules/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';
import { MatMenuModule } from "@angular/material/menu";

// Components
import { ContactComponent, ImpressumComponent, DatenschutzComponent, ProgressComponent } from './app.component'
import { GraphComponent } from './Pages/graph/graph.component';
import { ContentBoardComponent } from './Pages/contentBoard/contentBoard.component';
import { DashboardComponent } from './Pages/dashboard/dashboard.component';
import { ConceptOverviewComponent } from './Pages/conceptOverview/conceptOverview.component';
import { CodeTaskComponent } from './Pages/contentView/contentElement/codeTask/codeTask.component';
import { PdfViewerComponent } from './Pages/contentView/contentElement/pdfViewer/pdfViewer.component';
import { McTaskComponent } from './Pages/contentView/contentElement/mcTask/mcTask.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { FileUploadComponent } from './Pages/test/file-upload/file-upload.component';
import { ContentViewComponent } from './Pages/contentView/contentView.component';
import { CreateConceptDialogComponent } from './Pages/graph/graph-dialogs/create-concept-dialog/create-concept-dialog.component';
import { VideoViewerComponent } from './Pages/contentView/contentElement/videoViewer/videoViewer.component';
import { CompetenciesComponent } from './Pages/competencies/competencies.component';
import { ChatBotComponent } from './Pages/chat-bot/chat-bot.component';
import { ChatBotDialogComponent } from './Pages/chat-bot/chat-bot-dialog/chat-bot-dialog.component';
import { ChatSessionListComponent } from './Pages/chat-bot/chat-session-list/chat-session-list.component';
import { VideoTimeStampComponent } from './Pages/chat-bot/video-time-stamp/video-time-stamp.component';
import { LoginComponent } from './Pages/login/login.component';
import { ChangelogComponent } from './Pages/changelog/changelog.component';
import { AuthInterceptor } from "./Interceptors/auth-interceptor.service";
import { LoggedInGuard } from "./Guards/is-logged-in.guard";
import { EditorModule, TINYMCE_SCRIPT_SRC } from "@tinymce/tinymce-angular";
import { DiscussionListComponent } from './Pages/discussion/discussion-list/discussion-list.component';
import { DiscussionViewComponent } from './Pages/discussion/discussion-view/discussion-view.component';
import { DiscussionFilterComponent } from './Pages/discussion/discussion-list/discussion-filter/discussion-filter.component';
import { DiscussionListItemComponent } from './Pages/discussion/discussion-list/discussion-list-item/discussion-list-item.component';
import { DiscussionVoteboxComponent } from './Pages/discussion/discussion-votebox/discussion-votebox.component';
import { DiscussionViewQuestionComponent } from './Pages/discussion/discussion-view/discussion-view-question/discussion-view-question.component';
import { DiscussionViewMessageComponent } from './Pages/discussion/discussion-view/discussion-view-message/discussion-view-message.component';
import { DiscussionViewCreateComponent } from './Pages/discussion/discussion-view/discussion-view-create/discussion-view-create.component';
import { DiscussionCreationComponent } from './Pages/discussion/discussion-creation/discussion-creation.component';
import { DiscussionPrecreationComponent } from './Pages/discussion/discussion-creation/discussion-precreation/discussion-precreation.component';
import { TaskEvaluationOverviewComponent } from './Pages/task-evaluation-overview/task-evaluation-overview.component';
import { FreeTextTaskComponent } from './Pages/contentView/contentElement/free-text-task/free-text-task.component';
import { DraggableHeightDirective } from "./Directives/draggable-height.directive";
import { ConfettiService } from "./Services/animations/confetti.service";
import { VersionInterceptor } from "./Interceptors/version.interceptor";
import { MobileNavigatorComponent } from './Pages/mobile-navigator/mobile-navigator.component';
import { ToastrModule } from "ngx-toastr";
import { NotificationComponent } from './Pages/notification/notification.component';
import { NotificationBellComponent } from "./Pages/notification/notification-bell/notification-bell.component";
import { BellDirective } from "./Pages/notification/notification-bell/belldirective.directive";
import { AdminGuard } from "./Guards/is-admin.guard";
import { ConfirmationBoxComponent } from './Pages/confirmation-box/confirmation-box.component';
import { ConfirmDialogComponent } from './Pages/lecturersView/edit-coding/confirm-dialog.component';
import { LecturersViewModule } from './Pages/lecturersView/lecturers-view.module';
import { McTaskCreationComponent } from "./Pages/contentView/contentElement/mc-task-creation/mc-task-creation.component";
import { MCDescriptionDialogComponent } from "./Pages/contentView/contentElement/mc-task-creation/description-dialog/description-dialog.component";
import { MCScoreComponent } from "./Pages/contentView/contentElement/mc-task-creation/score/score.component";
import { FillinTaskNewComponent } from './Pages/contentView/contentElement/fill-in-task-new/fill-in-task-new.component';
import { DynamicBlankComponent } from './Pages/contentView/contentElement/fill-in-task-new/dynamic-blank/dynamic-blank.component';
import { GraphTaskComponent } from './Pages/contentView/contentElement/graph-task/graph-task.component';
import { GraphTasksModule } from "./Modules/graph-tasks/graph-tasks.module";
import { NotRegisteredComponent } from './Pages/not-registered/not-registered.component';
import { DynamicQuestionComponent } from './Pages/dynamic-question/dynamic-question.component';
import { ContentListComponent } from './Pages/content-list/content-list.component';
import { ContentListItemComponent } from './Pages/content-list/content-list-item/content-list-item.component';
import { MatExpansionModule } from "@angular/material/expansion";
import { CdkAccordionItem, CdkAccordionModule } from "@angular/cdk/accordion";
import { MatRippleModule } from "@angular/material/core";
import { CodeGameModule } from "./Modules/code-game/code-game.module";
import { CodeGameConfirmDialogComponent } from "./Pages/lecturersView/edit-code-game/code-game-confirm-dialog.component";
import { NavigationPreferenceToggleComponent } from './Pages/app-header/navigation-preference-toggle/navigation-preference-toggle.component';
import { AppHeaderComponent } from './Pages/app-header/app-header.component';
import { HighlightNavigatorComponent } from './Pages/highlight-navigator/highlight-navigator.component';

@NgModule({ declarations: [
        AppComponent,
        ContentBoardComponent,
        DashboardComponent,
        ConceptOverviewComponent,
        CodeTaskComponent,
        PdfViewerComponent,
        McTaskComponent,
        GraphComponent,
        FileUploadComponent,
        ContentViewComponent,
        CreateConceptDialogComponent,
        VideoViewerComponent,
        CompetenciesComponent,
        ChatBotComponent,
        ChatBotDialogComponent,
        ChatSessionListComponent,
        VideoTimeStampComponent,
        LoginComponent,
        ChangelogComponent,
        DiscussionListComponent,
        DiscussionViewComponent,
        DiscussionFilterComponent,
        DiscussionListItemComponent,
        DiscussionVoteboxComponent,
        DiscussionViewQuestionComponent,
        DiscussionViewMessageComponent,
        DiscussionViewCreateComponent,
        DiscussionCreationComponent,
        DiscussionPrecreationComponent,
        TaskEvaluationOverviewComponent,
        FreeTextTaskComponent,
        DraggableHeightDirective,
        ContactComponent,
        ImpressumComponent,
        DatenschutzComponent,
        MobileNavigatorComponent,
        ProgressComponent,
        NotificationComponent,
        NotificationBellComponent,
        BellDirective,
        ConfirmationBoxComponent,
        ConfirmDialogComponent,
        McTaskCreationComponent,
        MCDescriptionDialogComponent,
        MCScoreComponent,
        NotRegisteredComponent,
        FillinTaskNewComponent,
        DynamicBlankComponent,
        GraphTaskComponent,
        DynamicQuestionComponent,
        ContentListComponent,
        ContentListItemComponent,
        CodeGameConfirmDialogComponent,
        NavigationPreferenceToggleComponent,
        AppHeaderComponent,
        HighlightNavigatorComponent
    ],
    bootstrap: [AppComponent], imports: [ToastrModule.forRoot(),
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MaterialModule,
        NgxExtendedPdfViewerModule,
        LecturersViewModule,
        EditorModule,
        MarkdownModule.forRoot(),
        GraphTasksModule,
        MatMenuModule,
        MatExpansionModule,
        CdkAccordionModule,
        MatRippleModule,
        CodeGameModule], providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: VersionInterceptor, multi: true },
        { provide: TINYMCE_SCRIPT_SRC, useValue: 'tinymce/tinymce.min.js' },
        LoggedInGuard,
        AdminGuard,
        ConfettiService,
        Title,
        provideHttpClient(withInterceptorsFromDi()),
    ] })
export class AppModule { }

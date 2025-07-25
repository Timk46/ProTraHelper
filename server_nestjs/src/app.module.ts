/* eslint-disable prettier/prettier */
import { ContentModule } from './content/content.module';
import { FilesModule } from './files/files.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphModule } from './graph/graph.module';
import { PrismaModule } from './prisma/prisma.module';
import { ChatBotModule } from './ai/chat-bot/chat-bot.module';
import { DiscussionListController } from './discussion/discussion-list/discussion-list.controller';
import { DiscussionListService } from './discussion/discussion-list/discussion-list.service';
import { DiscussionDataService } from './discussion/discussion-data/discussion-data.service';
import { DiscussionVoteService } from './discussion/discussion-vote/discussion-vote.service';
import { DiscussionVoteController } from './discussion/discussion-vote/discussion-vote.controller';
import { DiscussionViewController } from './discussion/discussion-view/discussion-view.controller';
import { CodingQuestionGeneratorModule } from './tutor-kai/codingQuestionGenerator/codingQuestionGenerator.module';
import { DiscussionViewService } from './discussion/discussion-view/discussion-view.service';
import { DiscussionCreationService } from './discussion/discussion-creation/discussion-creation.service';
import { DiscussionCreationController } from './discussion/discussion-creation/discussion-creation.controller';
import { QuestionDataModule } from './question-data/question-data.module';

// BEGIN Tutor-Kai Imports
import { CryptoService } from './tutor-kai/langgraph-feedback/helper/crypto.service';
import { QuestionModule } from './tutor-kai/question/question.module';
import { RunCodeModule } from './tutor-kai/run-code/run-code.module';
import { TutoringFeedbackModule } from './tutor-kai/tutoring-feedback/tutoring-feedback.module';
// END Tutor-Kai Imports

// BEGIN UMLearn Imports
//import { DatabaseCourseCommunicationModule } from './umlearn/database-course-communication/database-course-communication.module';
import { DatabaseTaskCommunicationModule } from './umlearn/database-task-communication/database-task-communication.module';
import { DatabaseEditorCommunicationModule } from './umlearn/database-editor-communication/database-editor-communication.module';
import { GptModule } from './umlearn/gpt/gpt.module';
import { CompareModule } from './umlearn/compare/compare.module';
// END UMLearn Imports

// BEGIN ProTra 2.0 Imports
// END ProTra 2.0 Imports
import { GhFilesModule } from './gh-files/gh-files.module'; // Import the new module
import { RhinoDirectModule } from './rhino-direct/rhino-direct.module';
import { MCSliderModule } from './mcslider/mcslider.module';
import { RhinoIntegrationModule } from './rhino-integration/rhino-integration.module';

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/common/guards/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { RefreshTokenModule } from './auth/refresh-token/refresh-token.module';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './users/users.module';
import { FeedbackGenerationModule } from './ai/feedback-generation/feedback-generation.module';
import { McqCreationModule } from './mcqcreation/mcqcreation.module';
//import { McqevaluationModule } from './mcqevaluation/mcqevaluation.module'; CURRENTLY DISABLED
import { EventLogModule } from './EventLog/event-log.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { VersionInterceptor } from './common/interceptors/version.interceptor';
import { NotificationModule } from './notification/notification.module';
import { ContentLinkerService } from './content-linker/content-linker.service';
import { ContentLinkerModule } from './content-linker/content-linker.module';

import { AdminModule } from './admin/admin.module'; // Add this line
import { HighlightConceptsModule } from './highlight-concepts/highlight-concepts.module';

import { GraphSolutionEvaluationService } from './graph-solution-evaluation/graph-solution-evaluation.service';
import { GraphSolutionEvaluationModule } from './graph-solution-evaluation/graph-solution-evaluation.module';
import { TransitiveClosureService } from './graph-solution-evaluation/transitive-closure/transitive-closure.service';
import { DijkstraService } from './graph-solution-evaluation/dijkstra/dijkstra.service';
import { FloydService } from './graph-solution-evaluation/floyd/floyd.service';
import { KruskalService } from './graph-solution-evaluation/kruskal/kruskal.service';
import { ExampleSolutionGenerationModule } from './graph-solution-evaluation/example-solution-generation/example-solution-generation.module';
import { AiFeedbackModule } from './graph-solution-evaluation/ai-feedback/ai-feedback.module';
import { AiFeedbackService } from './graph-solution-evaluation/ai-feedback/ai-feedback.service';
import { PointCalculationModule } from './umlearn/point-calculation/point-calculation.module';

import { CodeGameModule } from './code-game/code-game.module';
import { LanggraphFeedbackModule } from './tutor-kai/langgraph-feedback/langgraph-feedback.module';
import { EvaluationDiscussionModule } from './evaluation-discussion/evaluation-discussion.module';


@Module({
  imports: [
    FilesModule,
    GraphModule,
    PrismaModule,
    AuthModule,
    RefreshTokenModule,
    UsersModule,
    ContentModule,
    ContentLinkerModule,
    ChatBotModule,
    QuestionDataModule,
    RunCodeModule,
    QuestionModule,
    FeedbackGenerationModule,
    McqCreationModule,
    //McqevaluationModule, CURRENTLY DISABLED
    EventLogModule,
    NotificationModule,
    ContentLinkerModule,
    CodingQuestionGeneratorModule,
    ScheduleModule.forRoot(),

    AdminModule, // Add this line
    HighlightConceptsModule,

    GraphSolutionEvaluationModule,
    ExampleSolutionGenerationModule,
    AiFeedbackModule,
    // UMLearnModules
    //DatabaseCourseCommunicationModule,
    DatabaseTaskCommunicationModule,
    DatabaseEditorCommunicationModule,
    GptModule,
    CompareModule,
    PointCalculationModule,
    CodeGameModule,
    LanggraphFeedbackModule,
    TutoringFeedbackModule,
    // ProTra 2.0 Modules
    GhFilesModule, // Add the new module to imports
    RhinoDirectModule,
    MCSliderModule,
    RhinoIntegrationModule,
    
    // Evaluation System
    EvaluationDiscussionModule
  ],
  controllers: [
    AppController,
    DiscussionListController,
    DiscussionVoteController,
    DiscussionViewController,
    DiscussionCreationController,
  ],
  providers: [
    AppService,
    DiscussionListService,
    DiscussionDataService,
    DiscussionVoteService,
    DiscussionViewService,
    DiscussionCreationService,
    CryptoService,
    {
      // Intercept and add version number to all answers. We could add this to single components instead.
      provide: APP_INTERCEPTOR,
      useClass: VersionInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // All Routes are protected by JWTGuard. Users only get Tokens by using CAS of the university
    },
    ContentLinkerService,
    GraphSolutionEvaluationService,
    TransitiveClosureService,
    DijkstraService,
    FloydService,
    KruskalService,
    AiFeedbackService,
  ],
})
export class AppModule {}

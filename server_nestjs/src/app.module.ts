/* eslint-disable prettier/prettier */
import { ContentModule } from './content/content.module';
import { FilesModule } from './files/files.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphModule } from './graph/graph.module';
import { PrismaModule } from './prisma/prisma.module';
//import { ChatBotModule } from './ai/chat-bot/chat-bot.module'; PERMANENT DISABLED
import { DiscussionListController } from './discussion/discussion-list/discussion-list.controller';
import { DiscussionListService } from './discussion/discussion-list/discussion-list.service';
import { DiscussionDataService } from './discussion/discussion-data/discussion-data.service';
import { DiscussionVoteService } from './discussion/discussion-vote/discussion-vote.service';
import { DiscussionVoteController } from './discussion/discussion-vote/discussion-vote.controller';
import { DiscussionViewController } from './discussion/discussion-view/discussion-view.controller';
import { DiscussionViewService } from './discussion/discussion-view/discussion-view.service';
import { DiscussionCreationService } from './discussion/discussion-creation/discussion-creation.service';
import { DiscussionCreationController } from './discussion/discussion-creation/discussion-creation.controller';
import { QuestionDataModule } from './question-data/question-data.module';
import { LoggerModule } from 'nestjs-pino';

// BEGIN Tutor-Kai Imports
import { CryptoService } from './tutor-kai/crypto/crypto.service';
import { QuestionModule } from './tutor-kai/question/question.module';
import { RunCodeModule } from './tutor-kai/run-code/run-code.module';
// END Tutor-Kai Imports

// BEGIN UMLearn Imports
//import { DatabaseCourseCommunicationModule } from './umlearn/database-course-communication/database-course-communication.module';
import { DatabaseTaskCommunicationModule } from './umlearn/database-task-communication/database-task-communication.module';
import { DatabaseEditorCommunicationModule } from './umlearn/database-editor-communication/database-editor-communication.module';
import { GptModule } from './umlearn/gpt/gpt.module';
import { CompareModule } from './umlearn/compare/compare.module';
// END UMLearn Imports

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ModulesModule } from './modules/modules.module';
import { FeedbackGenerationModule } from './ai/feedback-generation/feedback-generation.module';
// import { McqCreationModule } from './mcqcreation/mcqcreation.module'; CURRENTLY DISABLED
// import { McqevaluationModule } from './mcqevaluation/mcqevaluation.module'; CURRENTLY DISABLED
import { EventLogModule } from './EventLog/event-log.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { VersionInterceptor } from './common/interceptors/version.interceptor';


@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: (req, res) => ({
          context: 'HTTP',
        }),
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            levelFirst: true,
            translateTime: 'SYS:dd.mm.yyyy hh:MM:ss TT Z',
            singleLine: true,
          },
      },
    },
    }),
    FilesModule,
    GraphModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentModule,
    //ChatBotModule, PERMANANT DISABLED
    ModulesModule,
    QuestionDataModule,
    RunCodeModule,
    QuestionModule,
    FeedbackGenerationModule,
    // McqCreationModule, CURRENTLY DISABLED
    // McqevaluationModule, CURRENTLY DISABLED
    EventLogModule,
    // UMLearnModules
    //DatabaseCourseCommunicationModule,
    DatabaseTaskCommunicationModule,
    DatabaseEditorCommunicationModule,
    GptModule,
    CompareModule,
  ],
  controllers: [
    AppController,
    DiscussionListController, DiscussionVoteController, DiscussionViewController, DiscussionCreationController
  ],
  providers: [
    AppService,
    DiscussionListService,
    DiscussionDataService,
    DiscussionVoteService,
    DiscussionViewService,
    DiscussionCreationService,
    CryptoService,
    {// Intercept and add version number to all answers. We could add this to single components instead.
      provide: APP_INTERCEPTOR,
      useClass: VersionInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // All Routes are protected by JWTGuard. Users only get Tokens by using CAS of the university
    },

  ],
})

export class AppModule {}

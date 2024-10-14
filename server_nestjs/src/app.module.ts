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
import { CryptoService } from './tutor-kai/crypto/crypto.service';
import { QuestionModule } from './tutor-kai/question/question.module';
import { RunCodeModule } from './tutor-kai/run-code/run-code.module';
// END Tutor-Kai Imports

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ModulesModule } from './modules/modules.module';
import { FeedbackGenerationModule } from './ai/feedback-generation/feedback-generation.module';
import { McqCreationModule } from './mcqcreation/mcqcreation.module';
//import { McqevaluationModule } from './mcqevaluation/mcqevaluation.module'; CURRENTLY DISABLED
import { EventLogModule } from './EventLog/event-log.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { VersionInterceptor } from './common/interceptors/version.interceptor';
import { NotificationModule } from './notification/notification.module';
import { ContentLinkerService } from './content-linker/content-linker.service';
import { ContentLinkerModule } from './content-linker/content-linker.module';
import { GraphSolutionEvaluationService } from './graph-solution-evaluation/graph-solution-evaluation.service';
import { GraphSolutionEvaluationModule } from './graph-solution-evaluation/graph-solution-evaluation.module';

@Module({
  imports: [
    FilesModule,
    GraphModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentModule,
    ContentLinkerModule,
    ChatBotModule,
    ModulesModule,
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
    GraphSolutionEvaluationModule
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
    ContentLinkerService,
    GraphSolutionEvaluationService,
  ],
})

export class AppModule {}

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
import { DiscussionViewService } from './discussion/discussion-view/discussion-view.service';
import { DiscussionCreationService } from './discussion/discussion-creation/discussion-creation.service';
import { DiscussionCreationController } from './discussion/discussion-creation/discussion-creation.controller';
import { QuestionDataModule } from './question-data/question-data.module';
import { TaskOverviewModule } from './task-overview/task-overview.module';

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FeedbackGenerationModule } from './ai/feedback-generation/feedback-generation.module';

@Module({
  imports: [
    FilesModule,
    GraphModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentModule,
    ChatBotModule,
    QuestionDataModule, 
    TaskOverviewModule, FeedbackGenerationModule],
  controllers: [
    AppController,
    DiscussionListController, DiscussionVoteController, DiscussionViewController, DiscussionCreationController
  ],
  providers: [
    AppService,
    DiscussionListService, DiscussionDataService, DiscussionVoteService, DiscussionViewService, DiscussionCreationService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // All Routes are protected by JWTGuard. Users only get Tokens by using CAS of the university
    },

  ],
})

export class AppModule {}

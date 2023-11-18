import { ContentModule } from './content/content.module';
import { FilesModule } from './files/files.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphModule } from './graph/graph.module';
import { PrismaModule } from './prisma/prisma.module';
import { DiscussionController } from './discussion/discussion.controller';
import { DiscussionService } from './discussion/discussion.service';
import { ChatBotModule } from './ai/chat-bot/chat-bot.module';

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    FilesModule,
    GraphModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentModule,
    ChatBotModule],
  controllers: [
    AppController,
    DiscussionController
  ],
  providers: [
    AppService,
    DiscussionService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // All Routes are protected by JWTGuard. Users only get Tokens by using CAS of the university
    },

  ],
})
export class AppModule {}

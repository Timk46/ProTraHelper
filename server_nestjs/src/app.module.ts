import { ContentModule } from './content/content.module';
import { FilesModule } from './files/files.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphModule } from './graph/graph.module';
import { PrismaModule } from './prisma/prisma.module';
import { DiscussionController } from './discussion/discussion.controller';
import { DiscussionService } from './discussion/discussion.service';
import { DiscussionListController } from './discussion/discussion-list/discussion-list.controller';
import { DiscussionListService } from './discussion/discussion-list/discussion-list.service';
import { DiscussionDataService } from './discussion/discussion-data/discussion-data.service';
import { DiscussionVoteService } from './discussion/discussion-vote/discussion-vote.service';
import { DiscussionVoteController } from './discussion/discussion-vote/discussion-vote.controller';
import { DiscussionViewController } from './discussion/discussion-view/discussion-view.controller';
import { DiscussionViewService } from './discussion/discussion-view/discussion-view.service';
import { DiscussionCreationService } from './discussion/discussion-creation/discussion-creation.service';
import { DiscussionCreationController } from './discussion/discussion-creation/discussion-creation.controller';

@Module({
  imports: [FilesModule, GraphModule, PrismaModule, ContentModule],
  controllers: [AppController, DiscussionController, DiscussionListController, DiscussionVoteController, DiscussionViewController, DiscussionCreationController],
  providers: [AppService, DiscussionService, DiscussionListService, DiscussionDataService, DiscussionVoteService, DiscussionViewService, DiscussionCreationService],
})
export class AppModule {}

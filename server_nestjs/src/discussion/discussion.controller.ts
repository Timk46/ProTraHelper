import { Controller, Get, Param } from '@nestjs/common';
import { DiscussionService } from './discussion.service';
import { discussionMessageVoteDTO } from '@DTOs/index';

@Controller('discussion')
export class DiscussionController {
  constructor(private discussionService: DiscussionService) {}

  /**
   * This function returns the vote data for a given message
   * @param messageId
   * @returns the vote data
   */
  @Get('votes/:messageId/')
  async getVoteData(@Param('messageId') messageId : number): Promise<discussionMessageVoteDTO> {
    return this.discussionService.getVoteData(messageId);
  }

  /**
  * This function returns all discussions for a given concept node
  * @param conceptNodeId the concept node id
  * @param contentNodeId the content node id - if -1, all content nodes are considered
  * @param onlySolved whether to only return solved discussions
  * @param authorId the author id - if -1, all authors are considered
  * @param searchString the search string - if empty, all discussion are considered
  * @returns the discussions
  */
  @Get(':conceptNodeId/:contentNodeId/:onlySolved/:authorId/:searchString')
  async getDiscussions(
    @Param('conceptNodeId') conceptNodeId: number,
    @Param('contentNodeId') contentNodeId: number,
    @Param('onlySolved') onlySolved: boolean,
    @Param('authorId') authorId: number,
    @Param('searchString') searchString: string,
  ) {
    console.log('getDiscussions');
    return this.discussionService.getDiscussions(
      conceptNodeId,
      contentNodeId,
      onlySolved,
      authorId,
      JSON.parse(searchString)['content'],
    );
  }


}

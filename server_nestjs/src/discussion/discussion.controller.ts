import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DiscussionService } from './discussion.service';
import { discussionMessageDTO, discussionMessageVoteDTO } from '@DTOs/index';

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
    console.log('DiscussionController: getVoteData')
    return this.discussionService.getVoteData(messageId);
  }

  /**
   * This function returns a discussion for a given id
   * @param discussionId
   * @returns the discussion
   */
  @Get(':discussionId')
  async getDiscussion(@Param('discussionId') discussionId: number) {
    console.log('DiscussionController: getDiscussion')
    return this.discussionService.getDiscussion(discussionId);
  }

  /**
  * This function returns all discussions for a given concept node. All parameters are required,
  * though besides the conceptNodeId they can be -1 or false to indicate that they should not be considered.
  *
  * @param conceptNodeId the concept node id
  * @param contentNodeId the content node id - if -1, all content nodes are considered
  * @param onlySolved whether to only return solved discussions
  * @param authorId the author id - if -1, all authors are considered
  * @param searchString the search string, handled as JSON string with a 'content' field
  * @returns the discussions
  */
  @Get('list/:conceptNodeId/:contentNodeId/:onlySolved/:authorId/:searchString')
  async getDiscussions(
    @Param('conceptNodeId') conceptNodeId: number,
    @Param('contentNodeId') contentNodeId: number,
    @Param('onlySolved') onlySolved: boolean,
    @Param('authorId') authorId: number,
    @Param('searchString') searchString: string,
  ) {
    console.log('DiscussionController: getDiscussions');
    return this.discussionService.getDiscussions(
      conceptNodeId,
      contentNodeId,
      onlySolved,
      authorId,
      JSON.parse(searchString)['content'],
    );
  }

  /**
   * This function returns all messages for a given discussion
   * @param discussionId
   * @returns the messages
   */
  @Get('messages/:discussionId')
  async getMessages(@Param('discussionId') discussionId: number) {
    console.log('DiscussionController: getMessages')
    return this.discussionService.getDiscussionMessages(discussionId);
  }

  /** Returns the name of the concept node for a given discussion
   *
   * @param discussionId
   * @returns the name of the concept node
   */
  @Get('conceptNodeName/:discussionId')
  async getConceptNodeName(@Param('discussionId') discussionId: number) {
    console.log('DiscussionController: getConceptNodeName')
    return this.discussionService.getConceptNodeName(discussionId);
  }

  /** Returns the anonymous user for a given discussion
   *
   * @param userId
   * @returns the name of the content node
   */
  @Get('anonymousUser/:userId/:discussionId')
  async getAnonymousUser(@Param('userId') userId: number, @Param('discussionId') discussionId: number) {
    console.log('DiscussionController: getAnonymousUser')
    return this.discussionService.getAnonymousUser(userId, discussionId);
  }

  /** Creates a new message in the database and returns
   *
   * @param messageData
   * @returns a creation status if successful
   */
  @Post('messages/create')
  async createDiscussionMessage(@Body() messageData: discussionMessageDTO) {
    console.log('DiscussionController: createMessage')
    return this.discussionService.createDiscussionMessage(messageData);
  }


}

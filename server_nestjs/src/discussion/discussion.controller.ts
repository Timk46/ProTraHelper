import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DiscussionService } from './discussion.service';
import { AnonymousUserDTO, creationResponseDTO, discussionCreationDTO, discussionFilterDTO, discussionMessageCreationDTO, discussionMessageDTO, discussionMessageVoteCreationDTO, discussionMessageVoteDTO, discussionMessagesDTO, discussionNodeNamesDTO, discussionsDTO, nodeNameDTO } from '@DTOs/index';
import { debounce } from 'rxjs';

const debug: boolean = true; // set this to false to disable console logs
@Controller('discussionOLD')
export class DiscussionController {



  constructor(private discussionService: DiscussionService) {}



  /**
   * This function returns the vote data for a given message
   * @param messageId
   * @returns the vote data
   */
  @Get('votes/:messageId/:userId')
  async getVoteData(@Param('messageId') messageId : number, @Param('userId') userId : number): Promise<discussionMessageVoteDTO> {
    debug && console.log('DiscussionController: getVoteData');
    if (isNaN(messageId) || isNaN(userId)) {
      throw new Error('Invalid message id or user id');
    }
    return this.discussionService.getVoteData(Number(messageId),Number(userId));
  }

  @Post('votes/create')
  async createOrModifyVote(@Body() voteCreationData: discussionMessageVoteCreationDTO): Promise<discussionMessageVoteCreationDTO> {
    debug && console.log('DiscussionController: createOrModifyVote')
    return this.discussionService.createOrModifyVote(voteCreationData);
  }

  /**
   * This function returns a discussion for a given id
   * @param discussionId
   * @returns the discussion
   */
  @Get(':discussionId')
  async getDiscussion(@Param('discussionId') discussionId: number) {
    debug && console.log('DiscussionController: getDiscussion')
    if (isNaN(discussionId)) {
      throw new Error('Invalid discussion id');
    }
    return this.discussionService.getDiscussion(Number(discussionId));
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
  @Get('list/:filterData')
  async getDiscussions(@Param('filterData') filterData: any): Promise<discussionsDTO> {
    debug && console.log('DiscussionController: getDiscussions');
    return this.discussionService.getDiscussions(JSON.parse(filterData));
  }

  /**
   * This function returns all messages for a given discussion
   * @param discussionId
   * @returns the messages
   */
  @Get('messages/:discussionId')
  async getMessages(@Param('discussionId') discussionId: number): Promise<discussionMessagesDTO> {
    debug && console.log('DiscussionController: getMessages')
    if (isNaN(discussionId)) {
      throw new Error('Invalid discussion id');
    }
    return this.discussionService.getDiscussionMessages(Number(discussionId));
  }

  /** Returns the name of the concept node for a given discussion
   *
   * @param discussionId
   * @returns the name of the concept node
   */
  @Get('conceptNodeName/:discussionId')
  async getConceptNodeName(@Param('discussionId') discussionId: number): Promise<nodeNameDTO> {
    debug && console.log('DiscussionController: getConceptNodeName')
    if (isNaN(discussionId)) {
      throw new Error('Invalid discussion id');
    }
    return this.discussionService.getConceptNodeName(Number(discussionId));
  }

  /** Returns the anonymous user for a given discussion
   *
   * @param userId
   * @returns the name of the content node
   */
  @Get('anonymousUser/:userId/:discussionId')
  async getAnonymousUser(@Param('userId') userId: number, @Param('discussionId') discussionId: number): Promise<AnonymousUserDTO> {
    debug && console.log('DiscussionController: getAnonymousUser')
    if (isNaN(userId) || isNaN(discussionId)) {
      throw new Error('Invalid user id or discussion id');
    }
    return this.discussionService.getAnonymousUser(Number(userId), Number(discussionId));
  }

  /**
   * Returns the anonymous user for a given message
   * @param userId
   * @param messageId
   * @returns the anonymous user
   */
  @Get('anonymousUserByMessageId/:userId/:messageId')
  async getAnonymousUserByMessageId(@Param('userId') userId: number, @Param('messageId') messageId: number): Promise<AnonymousUserDTO> {
    debug && console.log('DiscussionController: getAnonymousUserByMessageId')
    if (isNaN(userId) || isNaN(messageId)) {
      throw new Error('Invalid user id or message id');
    }
    return this.discussionService.getAnonymousUserByMessageId(Number(userId), Number(messageId));
  }

  /**
   * Creates a new anonymous user in the database and returns it
   * @param data
   * @returns
   */
  @Post('anonymousUser/create')
  async createAnonymousUser(@Body() data: { userId: number, name: string }): Promise<AnonymousUserDTO> {
    debug && console.log('DiscussionController: createAnonymousUser')
    if (isNaN(data.userId)) {
      throw new Error('Invalid user id');
    }
    return this.discussionService.createAnonymousUser(Number(data.userId), data.name);
  }

  /** Creates a new message in the database and returns
   *
   * @param messageData
   * @returns a creation status if successful
   */
  @Post('messages/create')
  async createDiscussionMessage(@Body() messageData: discussionMessageCreationDTO): Promise<discussionMessageCreationDTO> {
    debug && console.log('DiscussionController: createMessage')
    return this.discussionService.createDiscussionMessage(messageData);
  }


  /**
   * Returns the node names for the given ids
   * @param conceptNodeId
   * @param contentNodeId
   * @param contentElementId
   * @returns the node names
   */
  @Get('nodeNames/:conceptNodeId/:contentNodeId/:contentElementId')
  async getDiscussionNodeNames(
    @Param('conceptNodeId') conceptNodeId: number,
    @Param('contentNodeId') contentNodeId: number,
    @Param('contentElementId') contentElementId: number): Promise<discussionNodeNamesDTO> {
    debug && console.log('DiscussionController: getDiscussionNodeNames');
    debug && console.log(conceptNodeId, contentNodeId, contentElementId);
    if (isNaN(conceptNodeId) || isNaN(contentNodeId) || isNaN(contentElementId)) {
      throw new Error('Invalid node ids');
    }
    return this.discussionService.getDiscussionNodeNames(Number(conceptNodeId), Number(contentNodeId), Number(contentElementId));
  }

  /**
   * Creates a new discussion in the database and returns it
   * @param discussionData
   * @returns the discussion
   */
  @Post('create')
  async createDiscussion(@Body() discussionData: discussionCreationDTO): Promise<discussionCreationDTO> {
    debug && console.log('DiscussionController: createDiscussion');
    return this.discussionService.createDiscussion(discussionData);
  }


}

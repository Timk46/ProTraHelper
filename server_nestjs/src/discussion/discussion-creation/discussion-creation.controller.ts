import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DiscussionCreationService } from './discussion-creation.service';
import { AnonymousUserDTO, discussionCreationDTO, discussionMessageCreationDTO, discussionNodeNamesDTO } from '@DTOs/index';
import { DiscussionDataService } from '../discussion-data/discussion-data.service';

const debug: boolean = true; // set this to false to disable console logs

@Controller('discussion/creation')
export class DiscussionCreationController {

  constructor(private creationService: DiscussionCreationService, private dataService: DiscussionDataService) {}

  /** Returns the anonymous user for a given discussion
   *
   * @param userId
   * @returns the name of the content node
   */
  @Get('anonymousUser/:userId/:discussionId')
  async getAnonymousUser(@Param('userId') userId: number, @Param('discussionId') discussionId: number): Promise<AnonymousUserDTO> {
    debug && console.log('DiscussionCreationController: getAnonymousUser')
    if (isNaN(userId) || isNaN(discussionId)) {
      throw new Error('Invalid user id or discussion id');
    }
    return this.creationService.getAnonymousUser(Number(userId), Number(discussionId));
  }

  /**
   * Returns the anonymous user for a given message
   * @param userId
   * @param messageId
   * @returns the anonymous user
   */
  @Get('anonymousUserByMessageId/:userId/:messageId')
  async getAnonymousUserByMessageId(@Param('userId') userId: number, @Param('messageId') messageId: number): Promise<AnonymousUserDTO> {
    debug && console.log('DiscussionCreationController: getAnonymousUserByMessageId')
    if (isNaN(userId) || isNaN(messageId)) {
      throw new Error('Invalid user id or message id');
    }
    return this.creationService.getAnonymousUserByMessageId(Number(userId), Number(messageId));
  }

  /**
   * Creates a new anonymous user in the database and returns it
   * @param data
   * @returns
   */
  @Post('anonymousUser/create')
  async createAnonymousUser(@Body() data: { userId: number, name: string }): Promise<AnonymousUserDTO> {
    debug && console.log('DiscussionCreationController: createAnonymousUser')
    if (isNaN(data.userId)) {
      throw new Error('Invalid user id');
    }
    return this.creationService.createAnonymousUser(Number(data.userId), data.name);
  }

  /**
   * Creates a new discussion in the database and returns it
   * @param discussionData
   * @returns the discussion
   */
  @Post('create')
  async createDiscussion(@Body() discussionData: discussionCreationDTO): Promise<discussionCreationDTO> {
    debug && console.log('DiscussionCreationController: createDiscussion');
    return this.creationService.createDiscussion(discussionData);
  }

  /** Creates a new message in the database and returns
   *
   * @param messageData
   * @returns a creation status if successful
   */
  @Post('messages/create')
  async createDiscussionMessage(@Body() messageData: discussionMessageCreationDTO): Promise<discussionMessageCreationDTO> {
    debug && console.log('DiscussionCreationController: createMessage')
    return this.creationService.createDiscussionMessage(messageData);
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
    debug && console.log('DiscussionCreationController: getDiscussionNodeNames');
    if (isNaN(conceptNodeId) || isNaN(contentNodeId) || isNaN(contentElementId)) {
      throw new Error('Invalid node ids');
    }
    return this.dataService.getDiscussionNodeNames(Number(conceptNodeId), Number(contentNodeId), Number(contentElementId));
  }
}

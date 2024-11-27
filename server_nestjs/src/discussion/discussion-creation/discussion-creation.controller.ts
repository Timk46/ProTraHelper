/* eslint-disable prettier/prettier */
import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { DiscussionCreationService } from './discussion-creation.service';
import { AnonymousUserDTO, discussionCreationDTO, discussionMessageCreationDTO, discussionNodeNamesDTO } from '@DTOs/index';
import { DiscussionDataService } from '../discussion-data/discussion-data.service';
import { RolesGuard, roles } from '@/auth/common/guards/roles.guard';


const debug = true; // set this to false to disable console logs
@UseGuards(RolesGuard)
@Controller('discussion/creation')
export class DiscussionCreationController {

  constructor(
    private readonly creationService: DiscussionCreationService,
    private readonly dataService: DiscussionDataService,) {}

  /** Returns the anonymous user for a given discussion
   *
   * @param userId
   * @returns the name of the content node
   */
  @roles('ANY')
  @Get('anonymousUser/:discussionId')
  async getAnonymousUser(@Req() req, @Param('discussionId') discussionId: number): Promise<AnonymousUserDTO> {
    debug && console.log('DiscussionCreationController: getAnonymousUser')
    if (isNaN(req.user.id) || isNaN(discussionId)) {
      throw new Error('Invalid user id or discussion id');
    }
    return await this.creationService.getAnonymousUser(Number(req.user.id), Number(discussionId));
  }

  /**
   * Returns the anonymous user for a given message
   * @param userId
   * @param messageId
   * @returns the anonymous user
   */
  @roles('ANY')
  @Get('anonymousUserByMessageId/:userId/:messageId')
  async getAnonymousUserByMessageId(@Req() req, @Param('messageId') messageId: number): Promise<AnonymousUserDTO> {
    debug && console.log('DiscussionCreationController: getAnonymousUserByMessageId')
    if (isNaN(req.user.id) || isNaN(messageId)) {
      throw new Error('Invalid user id or message id');
    }
    return await this.creationService.getAnonymousUserByMessageId(Number(req.user.id), Number(messageId));
  }

  /**
   * Creates a new anonymous user in the database and returns it
   * @param data
   * @returns
   */
  @roles('ADMIN')
  @Post('anonymousUser/create')
  async createAnonymousUser(@Req() req, @Body() data: { name: string }): Promise<AnonymousUserDTO> {
    debug && console.log('DiscussionCreationController: createAnonymousUser')
    if (isNaN(req.user.id)) {
      throw new Error('Invalid user id');
    }
    return await this.creationService.createAnonymousUser(Number(req.user.id), data.name);
  }

  /**
   * Creates a new discussion in the database and returns it
   * @param discussionData
   * @returns discussion id
   */
  @roles('ANY')
  @Post('create')
  async createDiscussion(@Req() req, @Body() discussionData: discussionCreationDTO): Promise<number> {
    debug && console.log('DiscussionCreationController: createDiscussion');
    if (isNaN(req.user.id)) {
      throw new Error('Invalid user id');
    }
    const discussionId = await this.creationService.createDiscussion(discussionData, Number(req.user.id));

    // notify potential users?

    return discussionId
  }

  /** Creates a new message in the database and returns
   *
   * @param messageData
   * @returns message number
   */
  @roles('ANY')
  @Post('messages/create')
  async createDiscussionMessage(
    @Req() req,
    @Body() messageData: discussionMessageCreationDTO
  ): Promise<number> {
    debug && console.log('DiscussionCreationController: createMessage')
    if (isNaN(req.user.id)) {
      throw new BadRequestException('Invalid user id');
    }
    return await this.creationService.createDiscussionMessage(
      messageData,
      Number(req.user.id)
    );

  }

  /**
   * Returns the node names for the given ids
   * @param conceptNodeId
   * @param contentNodeId
   * @param contentElementId
   * @returns the node names
   */
  @roles('ANY')
  @Get('nodeNames/:conceptNodeId/:contentNodeId/:contentElementId')
  async getDiscussionNodeNames(
    @Param('conceptNodeId') conceptNodeId: number,
    @Param('contentNodeId') contentNodeId: number,
    @Param('contentElementId') contentElementId: number): Promise<discussionNodeNamesDTO> {
    debug && console.log('DiscussionCreationController: getDiscussionNodeNames');
    if (isNaN(conceptNodeId) || isNaN(contentNodeId) || isNaN(contentElementId)) {
      throw new Error('Invalid node ids');
    }
    return await this.dataService.getDiscussionNodeNames(Number(conceptNodeId), Number(contentNodeId), Number(contentElementId));
  }

}

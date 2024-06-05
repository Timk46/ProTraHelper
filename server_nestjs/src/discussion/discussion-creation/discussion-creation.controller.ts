/* eslint-disable prettier/prettier */
import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { DiscussionCreationService } from './discussion-creation.service';
import { AnonymousUserDTO, discussionCreationDTO, discussionMessageCreationDTO, discussionNodeNamesDTO, NotificationDTO } from '@DTOs/index';
import { DiscussionDataService } from '../discussion-data/discussion-data.service';
import { RolesGuard, roles } from '@/auth/roles.guard';
import { NotificationService } from '@/notification/notification.service';

const debug = true; // set this to false to disable console logs
@UseGuards(RolesGuard)
@Controller('discussion/creation')
export class DiscussionCreationController {

  constructor(
    private readonly creationService: DiscussionCreationService,
    private readonly dataService: DiscussionDataService,
    private readonly notificationService: NotificationService) {}

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
    const discussionMessageId = await this.creationService.createDiscussionMessage(
      messageData,
      Number(req.user.id)
    );
    console.log("userId: ", req.user.id)

    const userIds = await this.creationService.getOriginalUserIdsFromDiscussion(messageData.discussionId);
    const uniqueUserIds = [...new Set(userIds)];
    console.log("hopefully sending notifications to Users: ", uniqueUserIds)
    for (const userId of uniqueUserIds) {
      try {
        const notification: NotificationDTO = {
            userId: userId,
            message: `A new comment by User: ${req.user.id} has been posted in a discussion you participated in.`,
            type: 'comment',
            timestamp: new Date(),
            isRead: false,
            delivered: false,
            discussionId: messageData.discussionId,
        };
        await this.notificationService.notifyUser(notification);
      } catch (error) {
        console.log('Error while sending notification to user: ',userId, error);
      }
    }
    console.log('Notifications sent');
    return discussionMessageId
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

  /**
   * Creates a new notification for the given user
   * @param notification
   * @returns the notificationDTO
   */
  private createNotification(notification: NotificationDTO): NotificationDTO {
    return {
      userId: notification.userId,
      message: notification.message,
      timestamp: new Date(),
      isRead: false,
      readTimestamp: null,
      type: notification.type,
    };
  }
}

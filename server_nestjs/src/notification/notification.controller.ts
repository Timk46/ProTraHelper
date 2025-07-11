/* eslint-disable prettier/prettier */
import { Controller, Post, Body, Get, Param, Delete, Put, Patch, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationDTO } from '@DTOs/notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   *
   * @param {NotificationDTO} notification
   * @returns {Promise<NotificationDTO>} notification
   */
  @Post('createNotification')
  async createNotification(@Body() notification: NotificationDTO): Promise<NotificationDTO> {
    return await this.notificationService.createNotification(notification);
  }

  // /**
  //  *
  //  * @param {number} id
  //  * @returns the notification with the given id
  //  */
  // @Get(':id')
  // async getOne(id: number, userId: number) {
  //   console.log("getOne is being called")
  //   return this.notificationService.getOne(id, userId);
  // }

  /**
   *
   * @returns all notifications
   */
  @Get('all')
  async getNotifications(
    @Query('userId') userId: number,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ): Promise<NotificationDTO[]> {
    return await this.notificationService.getAllNotifications(userId, limit, offset);
  }

  /**
   * Update a notification
   * @param {NotificationDTO} notification
   * @param {number} id
   * @returns {Promise<NotificationDTO>} the updated notification
   */
  @Put(':id')
  async updateNotification(
    @Body() notification: NotificationDTO,
    @Param('id') id: number,
  ): Promise<NotificationDTO> {
    console.log('updating notification with id: ', id, ' and notification: ', notification);
    return await this.notificationService.updateNotification(notification, +id);
  }

  /**
   * Mark a notification as read
   * @param {NotificationDTO} notification
   * @param {number} id
   * @returns {Promise<NotificationDTO>} the updated notification
   */
  @Patch(':id/read')
  async markAsRead(
    @Body() notification: NotificationDTO,
    @Param('id') id: number,
  ): Promise<NotificationDTO> {
    console.log('marking notification as read with id: ', id, ' and notification: ', notification);
    return await this.notificationService.markNotificationAsRead(id);
  }
  /**
   * Send a notification
   * @param notification
   *
   */
  @Post('send')
  async sendNotification(@Body() notification: NotificationDTO) {
    await this.notificationService.notifyUser(notification);
    return { message: 'Benachrichtigung gesendet' };
  }

  /**
   * Delete a notification
   * @param id
   * @returns {Promise<NotificationDTO>} the deleted notification
   */
  @Delete(':id')
  async deleteNotification(@Param('id') id: number): Promise<NotificationDTO> {
    return await this.notificationService.deleteNotification(+id);
  }

  /**
   * Notify all users
   * @param {NotificationDTO} notificationDto
   */
  @Post('/notify-all')
  async notifyAllUsers(@Body() notificationDto: NotificationDTO) {
    await this.notificationService.notifyAllUsers(notificationDto);
    return { message: 'Notifications sent to all users.' };
  }

  /**
   * Get the count of unread notifications for a user
   * @param {number} userId
   * @returns {Promise<number>} The count of unread notifications
   */
  @Get(':userId/unread-count')
  async getUnreadCountFromServer(@Param('userId') userId: number): Promise<number> {
    console.log('tpye of number userId send through @Param for unread count:', typeof userId);
    return (await this.notificationService.getUnreadCount(userId))
      ? this.notificationService.getUnreadCount(userId)
      : 0;
  }
}

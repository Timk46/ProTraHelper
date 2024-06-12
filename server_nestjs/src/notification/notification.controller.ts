/* eslint-disable prettier/prettier */
import { Controller, Post, Body, Get, Param, Delete, Put, Patch, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationDTO } from '@DTOs/notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   *
   * @param {NotificationDTO} notification
   * @returns
   */
  @Post('createNotification')
  async createNotification(@Body() notification: NotificationDTO) {
    return this.notificationService.createNotification(notification);
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
  @Get('/:id/all')
  async getAll(
   @Param('id)') userId: number,
   @Query('limit') limit: number,
   @Query('offset') offset: number,
  ) {
    return this.notificationService.getAll(userId, limit, offset);
  }

  /**
   * Update a notification
   * @param {NotificationDTO} notification
   * @param {number} id
   * @returns {Promise<NotificationDTO>} the updated notification
   */
  @Put(':id')
  async updateNotification(@Body() notification: NotificationDTO, @Param('id') id: number): Promise<NotificationDTO> {
    console.log("updating notification with id: ", id, " and notification: ", notification)
    return this.notificationService.updateNotification(notification, +id);
  }

  /**
   * Mark a notification as read
   * @param {NotificationDTO} notification
   * @param {number} id
   * @returns {Promise<NotificationDTO>} the updated notification
   */
  @Patch(':id/read')
  async markAsRead(@Body() notification: NotificationDTO, @Param('id') id: number): Promise<NotificationDTO> {
    console.log("marking notification as read with id: ", id, " and notification: ", notification)
    return this.notificationService.markNotificationAsRead(+id)
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
    return this.notificationService.deleteNotification(+id);
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
  async getUnreadCount(@Param('userId') userId: number): Promise<number> {
    return this.notificationService.getUnreadCount(userId) ?  this.notificationService.getUnreadCount(userId) : 0;
  }
}

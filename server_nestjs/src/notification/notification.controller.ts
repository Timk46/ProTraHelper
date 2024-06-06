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

  @Put(':id')
  async updateNotification(@Body() notification: NotificationDTO, @Param('id') id: number) {
    console.log("updating notification with id: ", id, " and notification: ", notification)
    return this.notificationService.updateNotification(notification, +id);
  }

  @Patch(':id/read')
  async markAsRead(@Body() notification: NotificationDTO, @Param('id') id: number) {
    console.log("marking notification as read with id: ", id, " and notification: ", notification)
    return this.notificationService.markNotificationAsRead(+id)
  }

  @Patch(':id/read')
  async markAsDelivered(@Body() notification: NotificationDTO, @Param('id') id: number) {
    console.log("marking notification as delivered with id: ", id, " and notification: ", notification)
    return this.notificationService.markNotificationAsDelivered(+id)
  }

  /**
   *
   * @param notification
   * @returns a message that the notification was sent
   */
  @Post('send')
  async sendNotification(@Body() notification: NotificationDTO) {
    await this.notificationService.notifyUser(notification);
    return { message: 'Benachrichtigung gesendet' };
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: number) {
    return this.notificationService.deleteNotification(+id);
  }
}

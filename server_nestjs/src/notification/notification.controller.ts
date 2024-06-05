/* eslint-disable prettier/prettier */
import { Controller, Post, Body, Get, Param, Delete, Put } from '@nestjs/common';
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

  /**
   *
   * @param {number} id
   * @returns the notification with the given id
   */
  @Get(':id')
  async getOne(id: number) {
    return this.notificationService.getOne(+id);
  }

  /**
   *
   * @returns all notifications
   */
  @Get()
  async getAll() {
    return this.notificationService.getAll();
  }

  @Put(':id')
  async updateNotification(@Body() notification: NotificationDTO, @Param('id') id: number) {
    console.log("updating notification with id: ", id, " and notification: ", notification)
    return this.notificationService.updateNotification(notification, +id);
  }

  @Put(':id/read')
  async markAsRead(@Body() notification: NotificationDTO, @Param('id') id: number) {
    console.log("marking notification as read with id: ", id, " and notification: ", notification)
    return this.notificationService.markNotificationAsRead(+id)
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

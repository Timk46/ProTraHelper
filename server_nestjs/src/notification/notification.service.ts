/* eslint-disable prettier/prettier */
import { Delete, Injectable } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationDTO } from '@Interfaces/index';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(
    private notificationGateway: NotificationGateway,
    private prisma: PrismaService) {
  }

  /**
   *  Notify a user
   * @param {NotificationDTO} notification
   */
  async notifyUser(notification: NotificationDTO) {
    await this.notificationGateway.sendNotification(notification);
  }

  /**
   * save the notification to the database
   * @param {NotificationDTO} notification
   */
  async createNotification(notification: NotificationDTO) {
    await this.prisma.notification.create({
      data: {
        message: notification.message,
        userId: notification.userId,
        timestamp: notification.timestamp,
        isRead: notification.isRead,
        readTimestamp: notification.readTimestamp,
        type: notification.type
      }
    });
  }

  /**
   *
   * @param {number} id
   * @returns the notification with the given id
   */
  async getOne(id: number) {
    return this.prisma.notification.findUnique({
      where: {
        id: id
      }
    });
  }

  /**
   * get all notifications with descending timestamp order
   * @returns all notifications
   */
  async getAll() {
    return this.prisma.notification.findMany({
      orderBy: {
        timestamp: 'desc'
      }
    });
  }

  /**
   * update the notification with the given id
   * @param {NotificationDTO} notification
   * @param {number} id
   */
  async updateNotification(notification: NotificationDTO, id: number) {
    return this.prisma.notification.update({
      where: {
        id: id
      },
      data: {
        message: notification.message,
        userId: notification.userId,
        timestamp: notification.timestamp,
        isRead: notification.isRead,
        readTimestamp: notification.readTimestamp,
        type: notification.type
      }
    });
  }

  /**
   *
   * @param {number} id
   * @returns
   */
  async deleteNotification(id: number) {
    return this.prisma.notification.delete({
      where: {
        id: id
      }
    });
  }
}

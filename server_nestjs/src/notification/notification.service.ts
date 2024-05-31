/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';
import { NotificationDTO } from '@Interfaces/index';
import { PrismaService } from '@/prisma/prisma.service';



@Injectable()
export class NotificationService  {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2) {
  }

  /** TODO (MAYBE BUILD MULTIPLE NOTIFY METHODS FOR DIFFERENT TYPES OF EVENTS)
   * Notify a user by emitting an event
   * @param {NotificationDTO} notification
   */
  async notifyUser(notification: NotificationDTO) {
    console.log('NotificationService: notifyUser');
    await this.createNotification(notification);
    this.eventEmitter.emit('notification', notification);
  }

  /**
   * save the notification to the database
   * @param {NotificationDTO} notification
   * @returns {Promise<Notification>}
   */
  private async createNotification(notification: NotificationDTO): Promise<NotificationDTO> {
   const createdNotification = await this.prisma.notification.create({
      data: {
        message: notification.message,
        userId: notification.userId,
        timestamp: notification.timestamp,
        delivered: false,
        isRead: notification.isRead,
        readTimestamp: notification.readTimestamp,
        type: notification.type
      }
    });

    // Emit the notification event????
    // this.eventemitter.emit(
    //   'notification.created',
    //   notification
    // );

    return createdNotification;
  }

  /**
   * get the notification with the given id
   * @param {number} id
   * @returns {Promise<NotificationDTO> | null} the notification with the given id
   */
  async getOne(id: number): Promise<NotificationDTO | null> {
    return this.prisma.notification.findUnique({
      where: {
        id: id
      }
    })
  }

  /**
   * get all notifications with descending timestamp order
   * @returns {Promise<NotificationDTO>} all notifications
   */
  async getAll(): Promise<NotificationDTO[]> {
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
   * @returns {Promise<NotificationDTO>}
   */
  async updateNotification(notification: NotificationDTO, id: number): Promise<NotificationDTO>{
    return this.prisma.notification.update({
      where: {
        id: id
      },
      data: {
        message: notification.message,
        userId: notification.userId,
        timestamp: notification.timestamp,
        isRead: notification.isRead,
        delivered: notification.delivered,
        readTimestamp: notification.readTimestamp,
        type: notification.type
      }
    });
  }

  /**
   * delete the notification with the given id
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

  /**
   * Mark notifications as delivered
   * @param {number[]} notificationIds
   * @returns {Promise<void>}
   */
  async markNotificationsAsDelivered(notificationIds: number[]): Promise<void>{
    await this.prisma.notification.updateMany({
      where: {
        id: {
          in: notificationIds
        }
      },
      data: {
        delivered: true
      }
    });
  }

  /**
   * Get undelivered notifications for a user
   * @param {number} userId
   * @returns {Promise<NotificationDTO[]>} undelivered notifications
   */
  async getUndeliveredNotifications(userId: number): Promise<NotificationDTO[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        delivered: false
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
  }

  /**
   * Mark a notification as read
   * @param {number} notificationId
   * @returns {Promise<NotificationDTO>}
   */
  async markNotificationAsRead(notificationId: number): Promise<NotificationDTO>{
    return this.prisma.notification.update({
      where: {
        id: notificationId
      },
      data: {
        isRead: true,
        readTimestamp: new Date(),
        delivered: true
      }
    });
  }


}

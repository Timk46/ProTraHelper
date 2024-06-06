/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { NotificationDTO } from '@Interfaces/index';
import { PrismaService } from '@/prisma/prisma.service';
import { Subject } from 'rxjs';




@Injectable()
export class NotificationService   {
  private notificationSubject = new Subject<NotificationDTO>();
  notification$ = this.notificationSubject.asObservable();
  constructor(
    private readonly prisma: PrismaService) {
  }

  /**
   * Notify a user by emitting an event
   * @param {NotificationDTO} notification
   */
  async notifyUser(notification: NotificationDTO) {
    console.log('NotificationService: notifyUser with message: ', notification.message , "for user: ", notification.userId);
    const createdNotification = await this.createNotification(notification);
    this.notificationSubject.next(createdNotification);
    console.log(`emitted notification: ${createdNotification.message} for user: ${createdNotification.userId}`)
  }

  /**
   * Get notifications as Observable
   */
  async getNotifications() {
    return this.notificationSubject.asObservable();
  }

  /**
   * save the notification to the database
   * @param {NotificationDTO} notification
   * @returns {Promise<Notification>}
   */
  async createNotification(notification: NotificationDTO): Promise<NotificationDTO> {
   const createdNotification = await this.prisma.notification.create({
      data: {
        message: notification.message,
        userId: notification.userId,
        timestamp: notification.timestamp,
        isDelivered: false,
        isRead: notification.isRead,
        readTimestamp: notification.readTimestamp,
        type: notification.type,
        discussionId: notification.discussionId,
      }
    });

    return createdNotification;
  }

  // /**
  //  * get the notification with the given id
  //  * @param {number} id
  //  * @param {number} userId
  //  * @returns {Promise<NotificationDTO> | null} the notification with the given id
  //  */
  // async getOne(id: number, userId: number): Promise<NotificationDTO | null> {
  //   return this.prisma.notification.findUnique({
  //     where: {
  //       id: id,
  //       userId: userId
  //     }
  //   })
  // }

  /**
   * get all notifications with descending timestamp order
   * @param {number} userId
   * @returns {Promise<NotificationDTO>} all notifications
   */
  async getAll(userId: number, limit: number, offset: number): Promise<NotificationDTO[]> {
    return this.prisma.notification.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        timestamp: 'desc'
      },
      //just taking a few notifications because of pagination
      take: Number(limit),
      skip: Number(offset)
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
        isDelivered: notification.isDelivered,
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
   * Get undelivered notifications for a user
   * @param {number} userId
   * @returns {Promise<NotificationDTO[]>} undelivered notifications
   */
  async getUndeliveredNotifications(userId: number): Promise<NotificationDTO[]> {
    console.log('NotificationService: getUndeliveredNotifications');
    return this.prisma.notification.findMany({
      where: {
        userId,
        isDelivered: false
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
    console.log('NotificationService: markNotificationAsRead');
    return this.prisma.notification.update({
      where: {
        id: notificationId
      },
      data: {
        isRead: true,
        readTimestamp: new Date(),
        isDelivered: true
      }
    });
  }

  /**
   * Mark notifications as delivered
   * @param {number} notificationId
   * @returns {Promise<void>}
   */
  async markNotificationAsDelivered(notificationId: number): Promise<void>{
    console.log('NotificationService: markNotificationsAsDelivered');
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId
      },
      data: {
        isDelivered: true
      }
    });
  }

}

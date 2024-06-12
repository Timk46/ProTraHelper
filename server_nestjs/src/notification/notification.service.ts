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
   * Notify a user by creating a notification and emitting it
   * @param {NotificationDTO} notification
   */
  async notifyUser(notification: NotificationDTO) {
    console.log('NotificationService: notifyUser with message: ', notification.message , "for user: ", notification.userId);
    const createdNotification = await this.createNotification(notification);
    this.notificationSubject.next(createdNotification);
    console.log(`emitted notification: ${createdNotification.message} for user: ${createdNotification.userId}`)
  }

  /**
   *
   * @param {NotificationDTO} notification
   */
  async notifyAllUsers(notification: NotificationDTO) {
    const users = await this.prisma.user.findMany();
    const notifications = users.map(user => ({
      userId: user.id,
      message: notification.message,
      type: notification.type,
      timestamp: new Date(),
      isRead: false,
    }));
    await this.prisma.notification.createMany({
      data: notifications,
    });
    console.log('Notifications created for all users');
    notifications.forEach(notification => {
      this.notificationSubject.next(notification);
    });
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
        timestamp: new Date(),
        isRead: false,
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
        timestamp: 'asc'
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
  async deleteNotification(id: number): Promise<NotificationDTO> {
    return this.prisma.notification.delete({
      where: {
        id: id
      }
    });
  }

  /**
   * get all unread notifications
   * @param {number} userId
   * @returns {Promise<NotificationDTO[]>} all unread notifications
   */
  async getUnreadNotifications(userId: number): Promise<NotificationDTO[]> {
    return this.prisma.notification.findMany({
      where: {
        userId: userId,
        isRead: false
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
      }
    });
  }

  /**
   * Mark a notification as read
   * @param {number} userId
   * @returns {Promise<NotificationDTO[]>} all notifications
   */
  async markAllNotificationsAsRead(userId: number): Promise<NotificationDTO[]> {
    console.log('NotificationService: markAllNotificationsAsRead');
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId: userId,
        isRead: false
      }
    });

    // Perform all updates and wait for them to complete
    const updatePromises = notifications.map(notification => {
      return this.prisma.notification.update({
        where: {
          id: notification.id
        },
        data: {
          isRead: true,
          readTimestamp: new Date()
        }
      });
    });
    const updatedNotifications = await Promise.all(updatePromises);

    // Assuming you have a method or a way to transform the Prisma notification objects to NotificationDTO objects
    // For example, a simple map operation if NotificationDTO is a subset of the Prisma notification object
    const notificationDTOs: NotificationDTO[] = updatedNotifications.map(notification => {
      // Transform the notification object to match the NotificationDTO structure
      // This is a placeholder transformation. Adjust according to your NotificationDTO structure
      return {
        id: notification.id,
        userId: notification.userId,
        message: notification.message,
        timestamp: notification.timestamp,
        isRead: notification.isRead,
        readTimestamp: notification.readTimestamp,
        type: notification.type,
        discussionId: notification.discussionId
      };
    });

    return notificationDTOs;
  }

  /**
   * Get the count of unread notifications for a user
   * @param {number} userId
   * @returns {Promise<number>} The count of unread notifications
   */
  async getUnreadCount(userId: number): Promise<number> {
    const count = await this.prisma.notification.count({
      where: {
        userId: Number(userId),
        isRead: false,
      },
    });
    return count;
  }
}



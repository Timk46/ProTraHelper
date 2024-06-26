/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { NotificationDTO } from '@Interfaces/index';
import { PrismaService } from '@/prisma/prisma.service';
import { Subject } from 'rxjs';

@Injectable()
export class NotificationService   {
  private notificationSubject = new Subject<NotificationDTO>();
  notification$ = this.notificationSubject.asObservable();

  constructor(private readonly prisma: PrismaService) { }

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
   * Notify multiple users by creating notifications and emitting them
   * @param {NotificationDTO[]} notifications
   */
  async notifyUsers(notifications: NotificationDTO[]) {
    console.log('NotificationService: notifyUsers for multiple users');

    const createdNotifications = await this.prisma.notification.createMany({
      data: notifications.map(notification => ({
        message: notification.message,
        userId: notification.userId,
        timestamp: new Date(),
        isRead: false,
        type: notification.type,
        discussionId: notification.discussionId,
      })),
    });

    // Fetch the created notifications to get their IDs
    const newNotifications = await this.prisma.notification.findMany({
      where: {
        userId: { in: notifications.map(n => n.userId) },
        timestamp: { gte: new Date(Date.now() - 1000) } // Assuming creation took less than a second
      },
      orderBy: { timestamp: 'desc' },
      take: notifications.length
    });

    // Emit notifications
    newNotifications.forEach(notification => {
      this.notificationSubject.next(this.toNotificationDTO(notification));
    });

    return newNotifications;
  }

  /**
   * Convert a Prisma notification to a NotificationDTO
   * @param prismaNotification
   * @returns {NotificationDTO} the notification as DTO
   */
  private toNotificationDTO(prismaNotification: NotificationDTO): NotificationDTO {
    return {
        id: prismaNotification.id,
        userId: prismaNotification.userId,
        message: prismaNotification.message,
        timestamp: prismaNotification.timestamp,
        isRead: prismaNotification.isRead,
        readTimestamp: prismaNotification.readTimestamp,
        type: prismaNotification.type,
        discussionId: prismaNotification.discussionId,
    };
}

  /**
   * paginated approach to notify all users
   * @param {NotificationDTO} notification
   */
  async notifyAllUsers(notification: Omit<NotificationDTO, 'userId'>, page = 1, pageSize = 100) {
    const skip = (page - 1) * pageSize;

    const users = await this.prisma.user.findMany({
      select: { id: true },
      take: pageSize,
      skip: skip
    });

    if (users.length > 0) {
      const notifications = users.map(user => ({
        ...notification,
        userId: user.id,
        timestamp: new Date(),
        isRead: false,
      }));

      await this.notifyUsers(notifications);

      // Recursively call for next page if there are more users
      if (users.length === pageSize) {
        await this.notifyAllUsers(notification, page + 1, pageSize);
      }
    }
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

  /**
   * get all notifications with descending timestamp order
   * @param {number} userId
   * @returns {Promise<NotificationDTO>} all notifications
   */
  async getAllNotifications(userId: number, limit: number, offset: number): Promise<NotificationDTO[]> {
    return this.prisma.notification.findMany({
      where: {
        userId: Number(userId)
      },
      orderBy: [
        {
          isRead: 'asc' // 'false' values (unread notifications) will come before 'true' values
        },
        {
          timestamp: 'desc'
        }
      ],
      take: Number(limit),
      skip: Number(offset)
    });
  }

  /**
   * update the notification with the given id
   * @param {NotificationDTO} notification
   * @param {number} id
   * @returns {Promise<NotificationDTO>} updated notification
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
   * @returns {Promise<NotificationDTO>} deleted notification
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
  async getUnreadNotifications(userId: number, page = 1, pageSize = 10): Promise<{ notifications: NotificationDTO[], totalCount: number }> {
    const skip = (page - 1) * pageSize;

    const [notifications, totalCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: {
          userId: userId,
          isRead: false
        },
        orderBy: {
          timestamp: 'desc'
        },
        skip: skip,
        take: pageSize
      }),
      this.prisma.notification.count({
        where: {
          userId: userId,
          isRead: false
        }
      })
    ]);

    return {
      notifications: notifications.map(this.toNotificationDTO),
      totalCount: totalCount
    };
  }

  /**
   * Mark a notification as read
   * @param {number} notificationId
   * @returns {Promise<NotificationDTO>} the updated notification
   */
  async markNotificationAsRead(notificationId: number): Promise<NotificationDTO>{
    return this.prisma.notification.update({
      where: {
        id: Number(notificationId)
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
    const currentTime = new Date();

    const [updatedCount, updatedNotifications] = await this.prisma.$transaction([
      this.prisma.notification.updateMany({
        where: {
          userId: userId,
          isRead: false
        },
        data: {
          isRead: true,
          readTimestamp: currentTime
        }
      }),
      this.prisma.notification.findMany({
        where: {
          userId: userId,
          isRead: true,
          readTimestamp: currentTime
        }
      })
    ]);

    return updatedNotifications.map(this.toNotificationDTO);
  }

  /**
   * Get the count of unread notifications for a user
   * @param {number} userId
   * @returns {Promise<number>} The count of unread notifications
   */
  async getUnreadCount(userId: number): Promise<number> {
    return await this.prisma.notification.count({
      where: {
        userId: Number(userId),
        isRead: false,
      },
    });

  }
}



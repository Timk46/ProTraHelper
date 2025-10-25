/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { NotificationDTO } from '@Interfaces/index';
import { NotificationType } from '@Interfaces/index';
import { PrismaService } from '@/prisma/prisma.service';
import { Subject } from 'rxjs';
import { Prisma } from '@prisma/client';
import { Notification } from '@prisma/client';
@Injectable()
export class NotificationService {
  private readonly notificationSubject = new Subject<NotificationDTO>();
  notification$ = this.notificationSubject.asObservable();

  constructor(private readonly prisma: PrismaService) {}

  // Select fields for notifications
  private readonly notificationSelect: Prisma.NotificationSelect = {
    id: true,
    userId: true,
    message: true,
    timestamp: true,
    isRead: true,
    readTimestamp: true,
    type: true,
    discussionId: true,
  };

  /**
   * Notify a user by creating a notification and emitting it
   * @param {NotificationDTO} notification
   */
  async notifyUser(notification: NotificationDTO): Promise<void> {
    try {
      const createdNotification = await this.createNotification(notification);
      console.log('Notification created:', createdNotification);
      this.notificationSubject.next(createdNotification);
    } catch (error) {
      console.error('Error notifying user:', error);
    }
  }

  /**
   * Notify multiple users by creating notifications and emitting them
   * @param {NotificationDTO[]} notifications
   * @returns {Promise<NotificationDTO[]>} the created notifications
   */
  async notifyUsers(notifications: NotificationDTO[]): Promise<NotificationDTO[]> {
    try {
      await this.prisma.notification.createMany({
        data: notifications.map(notification => ({
          message: notification.message,
          userId: notification.userId,
          timestamp: new Date(),
          isRead: false,
          type: notification.type,
          discussionId: notification.discussionId,
        })),
      });

      const newNotifications = await this.prisma.notification.findMany({
        where: {
          userId: { in: notifications.map(n => n.userId) },
          timestamp: { gte: new Date(Date.now() - 1000) },
        },
        orderBy: { timestamp: 'desc' },
        take: notifications.length,
        select: this.notificationSelect,
      });

      newNotifications.forEach(notification => {
        this.notificationSubject.next(this.toNotificationDTO(notification));
      });

      return newNotifications.map(this.toNotificationDTO);
    } catch (error) {
      console.error('Error notifying users:', error);
      throw error;
    }
  }

  /**
   * Paginated approach to notify all users
   * @param {Omit<NotificationDTO, 'userId'>} notification
   * @param {number} page
   * @param {number} pageSize
   */
  async notifyAllUsers(
    notification: Omit<NotificationDTO, 'userId'>,
    page = 1,
    pageSize = 100,
  ): Promise<void> {
    const skip = (page - 1) * pageSize;

    try {
      const users = await this.prisma.user.findMany({
        select: { id: true },
        take: pageSize,
        skip: skip,
      });

      if (users.length > 0) {
        const notifications = users.map(user => ({
          ...notification,
          userId: user.id,
          timestamp: new Date(),
          isRead: false,
        }));

        await this.notifyUsers(notifications);

        if (users.length === pageSize) {
          await this.notifyAllUsers(notification, page + 1, pageSize);
        }
      }
    } catch (error) {
      console.error('Error notifying all users:', error);
    }
  }

  /**
   * Save the notification to the database
   * @param {NotificationDTO} notification
   * @returns {Promise<NotificationDTO>}
   */
  async createNotification(notification: NotificationDTO): Promise<NotificationDTO> {
    try {
      const createdNotification = await this.prisma.notification.create({
        data: {
          message: notification.message,
          userId: notification.userId,
          timestamp: new Date(),
          isRead: false,
          readTimestamp: notification.readTimestamp,
          type: notification.type,
          discussionId: notification.discussionId,
        },
        select: this.notificationSelect,
      });

      return this.toNotificationDTO(createdNotification);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get all notifications with descending timestamp order
   * @param {number} userId
   * @param {number} limit
   * @param {number} offset
   * @returns {Promise<NotificationDTO[]>} all notifications
   */
  async getAllNotifications(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<NotificationDTO[]> {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: { userId: Number(userId) },
        orderBy: [{ isRead: 'asc' }, { timestamp: 'desc' }],
        take: Number(limit),
        skip: Number(offset),
        select: this.notificationSelect,
      });

      return notifications.map(this.toNotificationDTO);
    } catch (error) {
      console.error('Error fetching all notifications:', error);
      throw error;
    }
  }

  /**
   * Update the notification with the given id
   * @param {NotificationDTO} notification
   * @param {number} id
   * @returns {Promise<NotificationDTO>} updated notification
   */
  async updateNotification(notification: NotificationDTO, id: number): Promise<NotificationDTO> {
    try {
      const updatedNotification = await this.prisma.notification.update({
        where: { id: id },
        data: {
          message: notification.message,
          userId: notification.userId,
          timestamp: notification.timestamp,
          isRead: notification.isRead,
          readTimestamp: notification.readTimestamp,
          type: notification.type,
        },
        select: this.notificationSelect,
      });

      return this.toNotificationDTO(updatedNotification);
    } catch (error) {
      console.error('Error updating notification:', error);
      throw error;
    }
  }

  /**
   * Delete the notification with the given id
   * @param {number} id
   * @returns {Promise<NotificationDTO>} deleted notification
   */
  async deleteNotification(id: number): Promise<NotificationDTO> {
    try {
      const deletedNotification = await this.prisma.notification.delete({
        where: { id: id },
        select: this.notificationSelect,
      });
      return this.toNotificationDTO(deletedNotification);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get all unread notifications
   * @param {number} userId
   * @param {number} page
   * @param {number} pageSize
   * @returns {Promise<{ notifications: NotificationDTO[], totalCount: number }>} all unread notifications
   */
  async getUnreadNotifications(
    userId: number,
    page = 1,
    pageSize = 10,
  ): Promise<{ notifications: NotificationDTO[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;

    try {
      const [notifications, totalCount] = await this.prisma.$transaction([
        this.prisma.notification.findMany({
          where: { userId: userId, isRead: false },
          orderBy: { timestamp: 'desc' },
          skip: skip,
          take: pageSize,
          select: this.notificationSelect,
        }),
        this.prisma.notification.count({ where: { userId: userId, isRead: false } }),
      ]);

      return {
        notifications: notifications.map(this.toNotificationDTO),
        totalCount: totalCount,
      };
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param {number} notificationId
   * @returns {Promise<NotificationDTO>} the updated notification
   */
  async markNotificationAsRead(notificationId: number): Promise<NotificationDTO> {
    try {
      const updatedNotification = await this.prisma.notification.update({
        where: { id: Number(notificationId) },
        data: {
          isRead: true,
          readTimestamp: new Date(),
        },
        select: this.notificationSelect,
      });

      return this.toNotificationDTO(updatedNotification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {number} userId
   * @returns {Promise<NotificationDTO[]>} all notifications
   */
  async markAllNotificationsAsRead(userId: number): Promise<NotificationDTO[]> {
    const currentTime = new Date();

    try {
      const [updatedCount, updatedNotifications] = await this.prisma.$transaction([
        this.prisma.notification.updateMany({
          where: { userId: userId, isRead: false },
          data: {
            isRead: true,
            readTimestamp: currentTime,
          },
        }),
        this.prisma.notification.findMany({
          where: { userId: userId, isRead: true, readTimestamp: currentTime },
          select: this.notificationSelect,
        }),
      ]);

      return updatedNotifications.map(this.toNotificationDTO);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get the count of unread notifications for a user
   * @param {number} userId
   * @returns {Promise<number>} The count of unread notifications
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      return await this.prisma.notification.count({
        where: {
          userId: Number(userId),
          isRead: false,
        },
      });
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      throw error;
    }
  }

  /**
   * Notify about evaluation comment
   * @param {string} submissionId
   * @param {number} commenterId
   */
  async notifyEvaluationComment(submissionId: number, commenterId: number): Promise<void> {
    try {
      const submission = await this.prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
          author: { select: { id: true, firstname: true, lastname: true } },
        },
      });

      if (submission && submission.authorId !== commenterId) {
        await this.notifyUser({
          userId: submission.authorId,
          message: `New evaluation comment on your submission "${submission.title}"`,
          type: NotificationType.EVALUATION_COMMENT,
          timestamp: new Date(),
          isRead: false,
        });
      }
    } catch (error) {
      console.error('Error notifying evaluation comment:', error);
    }
  }

  /**
   * Notify about evaluation rating
   * @param {string} submissionId
   * @param {number} raterId
   */
  async notifyEvaluationRating(submissionId: number, raterId: number): Promise<void> {
    try {
      const submission = await this.prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
          author: { select: { id: true, firstname: true, lastname: true } },
        },
      });

      if (submission && submission.authorId !== raterId) {
        await this.notifyUser({
          userId: submission.authorId,
          message: `New evaluation rating on your submission "${submission.title}"`,
          type: NotificationType.EVALUATION_RATING,
          timestamp: new Date(),
          isRead: false,
        });
      }
    } catch (error) {
      console.error('Error notifying evaluation rating:', error);
    }
  }

  /**
   * Notify about phase switch
   * @param {number} sessionId
   * @param {string} newPhase
   */
  async notifyPhaseSwitch(sessionId: number, newPhase: string): Promise<void> {
    try {
      const session = await this.prisma.evaluationSession.findUnique({
        where: { id: sessionId },
        include: {
          module: { select: { name: true } },
          submissions: {
            include: {
              author: { select: { id: true, firstname: true, lastname: true } },
            },
          },
        },
      });

      if (session) {
        const userIds = session.submissions.map(s => s.authorId);
        const uniqueUserIds = [...new Set(userIds)];

        const notifications = uniqueUserIds.map(userId => ({
          userId,
          message: `Evaluation session "${session.title}" in ${session.module.name} has switched to ${newPhase} phase`,
          type: NotificationType.PHASE_SWITCH,
          timestamp: new Date(),
          isRead: false,
        }));

        await this.notifyUsers(notifications);
      }
    } catch (error) {
      console.error('Error notifying phase switch:', error);
    }
  }

  /**
   * Convert a Prisma notification to a NotificationDTO
   * @param {Notification} prismaNotification
   * @returns {NotificationDTO} the notification as DTO
   */
  private toNotificationDTO(prismaNotification: Notification): NotificationDTO {
    return {
      ...prismaNotification,
      type: prismaNotification.type as NotificationType,
    };
  }
}

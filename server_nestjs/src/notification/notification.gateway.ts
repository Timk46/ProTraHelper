/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { NotificationDTO } from '@Interfaces/notification.dto';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { NotificationService } from './notification.service';

@WebSocketGateway(3001, {
  cors: {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST'],
    credentials: true,
    transports: ['websocket']
  },
  namespace: '/notifications'
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private connectedUsers: Map<string, Socket> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService
    ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const token = client.handshake.query.token as string;
    // Check if the token is valid
    if (this.jwtService.verifyAsync(token, { secret: process.env.JWT_SECRET_KEY })) {
      try {
        console.log(`Token: ${token}`);
        const userId = await this.extractIdFromtoken(token)
        this.connectedUsers.set(userId, client);
        console.log(`Client connected: ${client.id}, User ID: ${userId}`);

        // fetching undelivered notifications
        const undeliveredNotifications = await this.notificationService.getUndeliveredNotifications(Number(userId));
        if (undeliveredNotifications.length > 0) {
           undeliveredNotifications.forEach(notification => {
             client.emit('notification', notification);
           });

          // Mark notifications as delivered
          const notificationIds = undeliveredNotifications.map(notification => notification.id);
          await this.notificationService.markNotificationsAsDelivered(notificationIds);
        }
      } catch (error) {
        client.disconnect();
        console.log(`Client disconnected: ${client.id}, Reason: Invalid token`);
      }
    } else {
      client.disconnect();
      console.log(`Client disconnected: ${client.id}, Reason: No token`);
    }
  }

  /**
   * Extract the user id from the token
   * @param token
   * @returns the user id from the token
   */
  async extractIdFromtoken(token: string): Promise<string> {
    const userId = this.jwtService.decode(token).id;
    return userId
  }

  /**
   * Handle client disconnect
   */
  async handleDisconnect(client: Socket) {
    const userId = [...this.connectedUsers.entries()]
      .find(([_, socket]) => socket.id === client.id)?.[0];
    if (userId) {
      this.connectedUsers.delete(userId);
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  async sendNotification(notification: NotificationDTO) {
    const client = this.connectedUsers.get(String(notification.userId));
    if (client) {
      console.log(`Sending notification to user ${notification.userId}`);
      client.emit('notification', notification.message);
      // IMPLEMENT TODO: Mark notification as delivered
      await this.notificationService.markNotificationsAsDelivered([notification.id]);
    } else {
      console.log(`User ${notification.userId} is not connected`);
    }
  }

  @SubscribeMessage('notifications')
  handleNotification(@MessageBody() notification: NotificationDTO): void {
    this.sendNotification(notification);
  }
}

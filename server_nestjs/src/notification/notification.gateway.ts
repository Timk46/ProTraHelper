/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { NotificationDTO } from '@Interfaces/notification.dto';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
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
  private connectedUsers: Map<number, Socket> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService
    ) {
    }

  async onModuleInit() {
    console.log('NotificationGateway initialized');
    this.notificationService.notification$.subscribe((notification: NotificationDTO) => {
      console.log('NotificationGateway: received notification from service:', notification);
      this.sendNotification(notification);
    });
  }

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const token = client.handshake.query.token as string;
    // Check if the token is valid
    try {
      console.log(`Token: ${token}`);
      const decoded = await this.jwtService.verifyAsync(token, { secret: process.env.JWT_SECRET_KEY });
      const userId = decoded.id;
      console.log("verified")
      // Check if the user is already connected and add the user to the connected users map
      if(userId && !this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, client);
        console.log(`Client connected: ${client.id}, User ID: ${userId}`);

      // probably not necesseary as clients fetch all their notifications elsewhere and they are sorted

      // const unreadNotifications = await this.notificationService.getUnreadNotifications(userId);
      // console.log("unread Notifications: ", unreadNotifications.map(notification => notification.message));
      // if (unreadNotifications.length > 0) {
      //    unreadNotifications.forEach(notification => {
      //      client.emit('notification', notification);
      //    });

      // }
      } else {
        throw new Error("Invalid token")
      }
    } catch (error) {
      client.disconnect();
      console.log(`Client disconnected: ${client.id}, Reason: Invalid token`);
    }
  }

  /**
   * Handle client disconnect
   */
  async handleDisconnect(client: Socket) {
    const userId = [...this.connectedUsers.entries()]
      .find(([_, socket]) => socket.id === client.id)?.[0];
    if (userId) {
      this.connectedUsers.delete(userId);
      console.log(`Removed user ID: ${userId} from connected users`);
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   *
   * @param {NotificationDTO} notification
   */
  async sendNotification(notification: NotificationDTO) {
    const client = this.connectedUsers.get(notification.userId);
    console.log(`Client: ${client} for user: ${notification.userId} with id: ${client}`);
    if (client) {
      console.log(`Sending Notification:  ${notification.message} to user:  ${notification.userId}`);
      client.emit('notification', notification);
      console.log(`emitted notification: ${notification.message} for user: ${notification.userId}`)
    } else {
      console.log(`User ${notification.userId} is not connected`);
    }
  }

  /** NOT USED
   * Handle sendNotification event from clients or elsewhere
   * @param {NotificationDTO} notification
   */
  @SubscribeMessage('sendNotification')
  async handleSendNotification(@MessageBody() notification: NotificationDTO) {
    const createdNotification = await this.notificationService.createNotification(notification);
    const client = this.connectedUsers.get(notification.userId);
    if (client) {
      client.emit('notification', createdNotification);
    }
  }
}

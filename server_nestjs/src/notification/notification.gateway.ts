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
  private connectedUsers: Map<number, Set<Socket>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService
    ) {
    }

  async onModuleInit() {
    this.notificationService.notification$.subscribe((notification: NotificationDTO) => {
      this.sendNotification(notification);
    });
  }

  /**
   * immediately is called to handle client connection
   * @param {Socket} client
   */
  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const token = client.handshake.query.token as string;
    // Check if the token is valid
    try {
      console.log(`Token: ${token}`);
      const decoded = await this.jwtService.verifyAsync(token, { secret: process.env.JWT_SECRET_KEY });
      const userId = decoded.id;
      console.log("verified with user id: ", userId)
      // Check if the user is already connected and add the user to the connected users map
      if(userId) {
        if(!this.connectedUsers.has(userId)) {
          this.connectedUsers.set(userId, new Set());
        }
        this.connectedUsers.get(userId)?.add(client);
        // OLD WAY:
        // const connections = this.connectedUsers.get(userId) || [];
        // connections.push(client);
        // this.connectedUsers.set(userId, connections);
        console.log(`Client connected: ${client.id}, User ID: ${userId}`);
      } else {
        throw new Error("user already connected")
      }
    } catch (error) {
      client.disconnect();
      console.log(`Client disconnected: ${client.id}, Reason: Invalid token`);
    }
    console.log("this connceted users: ", this.connectedUsers)
  }

  /**
   * Handle client disconnect
   * @param {Socket} client
   */
  async handleDisconnect(client: Socket) {
    for(const [userId, sockets] of this.connectedUsers.entries()) {
      if(sockets.has(client)) {
        sockets.delete(client);
        if(sockets.size === 0) {
          this.connectedUsers.delete(userId);
        }
        console.log(`Removed user ID: ${userId} from connected users`);
        break;
      }
    }
    // OLD WAY
    // const userId = [...this.connectedUsers.entries()]
    //   .find(([_, sockets]) => sockets.some(socket => socket.id === client.id))?.[0];
    // if (userId) {
    //   const connections = this.connectedUsers.get(userId) || [];
    //   this.connectedUsers.set(userId, connections.filter(socket => socket.id !== client.id));

    // }
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   * sends a notification to all clients
   * @param {NotificationDTO} notification
   */
  async sendNotification(notification: NotificationDTO) {
    //OLD WAY:
    const clients = this.connectedUsers.get(notification.userId);
    if(clients && clients.size > 0) {
    clients.forEach(client => {
      console.log(`Sending Notification:  ${notification.message} to user:  ${notification.userId}`);
      client.emit('notification', notification);
    })
  }
    // const sockets = this.connectedUsers.get(notification.userId);
    // if (sockets && sockets.size > 0) {
    //   // Send the notification to only one socket (the first one in the set)
    //   const firstSocket = sockets.values().next().value;
    //   console.log(`Sending Notification: ${notification.message} to user: ${notification.userId}`);
    //   firstSocket.emit('notification', notification);
    // }
  }

  /** NOT USED
   * Handle sendNotification event from clients or elsewhere
   * @param {NotificationDTO} notification
   */
  @SubscribeMessage('sendNotification')
  async handleSendNotification(@MessageBody() notification: NotificationDTO) {
    const createdNotification = await this.notificationService.createNotification(notification);
    this.sendNotification(createdNotification);
  }
}

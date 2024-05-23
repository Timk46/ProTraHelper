/* eslint-disable prettier/prettier */
import { NotificationDTO } from '@Interfaces/notification.dto';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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


  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const token = client.handshake.query.token as string;
    if (token) {
      console.log(`Token: ${token}`);
      const userId = await this.extractIdFromtoken(token)
      this.connectedUsers.set(userId, client);
    }
  }

  async extractIdFromtoken(token: string): Promise<string> {
    // Extract user id from token
    return '1';
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.connectedUsers.delete(userId);
    }
  }

  async sendNotification(notification: NotificationDTO) {
    const client = this.connectedUsers.get(String(notification.userId));
    if (client) {
      client.emit('notification', notification.message);
    } else {
      console.log(`User ${notification.userId} is not connected`);
    }
  }

  @SubscribeMessage('notifications')
  handleNotification(@MessageBody() notification: NotificationDTO): void {
    this.sendNotification(notification);
  }
}

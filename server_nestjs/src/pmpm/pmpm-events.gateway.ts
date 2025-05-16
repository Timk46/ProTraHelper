import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsResponse,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, specify your Angular app origin
  },
  namespace: 'pmpm',
})
export class PmpmEventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PmpmEventsGateway.name);
  private readonly clientBySession = new Map<string, string>();

  @WebSocketServer() server: Server;

  // Gateway initialized
  afterInit() {
    this.logger.log('PMPM WebSocket Gateway initialized');
  }

  // New client connected
  handleConnection(client: Socket) {
    const sessionId = client.handshake.query.sessionId as string;
    this.logger.log(`Client connected: ${client.id}, sessionId: ${sessionId}`);

    if (sessionId) {
      this.clientBySession.set(sessionId, client.id);
    }
  }

  // Client disconnected
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from mapping
    for (const [sessionId, clientId] of this.clientBySession.entries()) {
      if (clientId === client.id) {
        this.clientBySession.delete(sessionId);
        break;
      }
    }
  }

  // Client subscribes to session events
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, sessionId: string): WsResponse<string> {
    this.logger.log(`Client ${client.id} subscribed to session ${sessionId}`);
    this.clientBySession.set(sessionId, client.id);

    return { event: 'subscribed', data: sessionId };
  }

  // Server-side event for when an analysis is completed
  notifyAnalysisCompleted(sessionId: string, data: any) {
    const clientId = this.clientBySession.get(sessionId);

    if (clientId) {
      this.server.to(clientId).emit('analysis.completed', data);
      this.logger.log(`Emitted analysis.completed for session ${sessionId}`);
    } else {
      this.logger.warn(`No client found for session ${sessionId}`);
    }
  }

  // Server-side event for file export
  notifyFileExported(sessionId: string, data: any) {
    const clientId = this.clientBySession.get(sessionId);

    if (clientId) {
      this.server.to(clientId).emit('file.exported', data);
      this.logger.log(`Emitted file.exported for session ${sessionId}`);
    } else {
      this.logger.warn(`No client found for session ${sessionId}`);
    }
  }

  // Client-side message handling for parameter changes
  @SubscribeMessage('parameter.change')
  handleParameterChange(client: Socket, payload: any): void {
    this.logger.log(`Received parameter.change from ${client.id}: ${JSON.stringify(payload)}`);

    // In a real implementation, this would trigger a calculation or update
    // For now, we just log it and echo back a response after a short delay
    setTimeout(() => {
      client.emit('parameter.updated', {
        parameterId: payload.parameterId,
        value: payload.value,
        results: {
          stressValue: Math.random() * 100,
          deformation: Math.random() * 10,
        }
      });
    }, 200); // Simulate a short calculation time
  }
}

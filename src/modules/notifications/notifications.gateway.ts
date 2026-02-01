import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Notification } from '@/database/entities';

export type NotificationRealtimePayload = Pick<
  Notification,
  'id' | 'title' | 'message' | 'type' | 'reference_id' | 'read_at' | 'createdAt'
>;

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust for production
  },
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  afterInit(_server: Server) {
    this.logger.log('Notifications Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    // In a real app, we would extract the token from handshake.auth or query
    // and validate the user here.
    const userId = client.handshake.query.userId as string;

    if (userId) {
      await client.join(`user_${userId}`);
      this.logger.log(`User ${userId} connected (Socket: ${client.id})`);
      return;
    }

    this.logger.warn(
      `Connection attempt without userId (Socket: ${client.id})`,
    );
    // client.disconnect(); // Optional: strict mode
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendNotificationToUser(
    userId: string,
    notification: NotificationRealtimePayload,
  ) {
    this.server.to(`user_${userId}`).emit('new_notification', notification);
  }
}

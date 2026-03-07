import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface ChatMessagePayload {
  chatId: string;
  message: unknown;
  senderId: string;
  recipientId?: string;
}

interface ChatAcceptedPayload {
  chatId: string;
  scoutId?: string;
  playerId?: string;
}

interface ChatRequestedPayload {
  chatId: string;
  scoutId: string;
  playerId: string;
}

@WebSocketGateway({ namespace: '/chats', cors: true })
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatsGateway.name);

  handleConnection = (client: Socket) => {
    const userId =
      (client.handshake.auth as Record<string, unknown>)?.userId ||
      (client.handshake.query as Record<string, unknown>)?.userId;

    if (!userId || typeof userId !== 'string') {
      this.logger.warn('Socket connection rejected: missing userId');
      client.disconnect(true);
      return;
    }

    void client.join(`user:${userId}`);
    this.logger.debug(`Socket connected for user ${userId}`);
  };

  handleDisconnect = (client: Socket) => {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  };

  private emitChatMessage = (payload: ChatMessagePayload) => {
    const { recipientId, chatId, message } = payload;
    if (!recipientId) return;

    this.server.to(`user:${recipientId}`).emit('chat.message', {
      chatId,
      message,
    });
  };

  private emitChatAccepted = (payload: ChatAcceptedPayload) => {
    const { chatId, playerId } = payload;
    if (playerId) {
      this.server.to(`user:${playerId}`).emit('chat.accepted', { chatId });
    }
  };

  private emitChatRequested = (payload: ChatRequestedPayload) => {
    const { chatId, scoutId, playerId } = payload;
    this.server.to(`user:${scoutId}`).emit('chat.requested', {
      chatId,
      playerId,
    });
  };

  @OnEvent('chat.message')
  onChatMessage(payload: ChatMessagePayload) {
    this.emitChatMessage(payload);
  }

  @OnEvent('chat.accepted')
  onChatAccepted(payload: ChatAcceptedPayload) {
    this.emitChatAccepted(payload);
  }

  @OnEvent('chat.requested')
  onChatRequested(payload: ChatRequestedPayload) {
    this.emitChatRequested(payload);
  }
}

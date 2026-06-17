import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import type { SendMessageDto } from './dtos';
import type { JwtPayload } from '@/common/interfaces';

type ChatSocketEvents = Record<string, (...args: unknown[]) => void>;

interface ChatSocketData {
  userId?: string;
}

type AuthenticatedSocket = Socket<
  ChatSocketEvents,
  ChatSocketEvents,
  ChatSocketEvents,
  ChatSocketData
>;

interface ChatMessagePayload {
  chatId: string;
  message: unknown;
  senderId: string;
  recipientId?: string;
  participantIds?: string[];
  chat?: unknown;
}

interface ChatReadPayload {
  chatId: string;
  userId: string;
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

type ChatRoomBody = string | { chatId?: string };
type SocketSendMessageBody = {
  chatId?: string;
  content?: string;
  messageType?: SendMessageDto['messageType'];
  attachmentUrl?: string;
  clientMessageId?: string;
};

@WebSocketGateway({ namespace: '/chats', cors: true })
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  handleConnection = (client: AuthenticatedSocket) => {
    try {
      const payload = this.verifySocketToken(client);
      client.data.userId = payload.sub;
      void client.join(this.userRoom(payload.sub));
      this.logger.debug(`Socket connected for user ${payload.sub}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Socket authentication failed';
      this.logger.warn(`Socket connection rejected: ${message}`);
      client.disconnect(true);
    }
  };

  handleDisconnect = (client: Socket) => {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  };

  @SubscribeMessage('chat:join')
  async onJoinChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ChatRoomBody,
  ) {
    const userId = this.getSocketUserId(client);
    const chatId = this.getChatId(body);

    await this.chatService.getChatById(chatId, userId);
    await client.join(this.chatRoom(chatId));

    return { success: true, chatId };
  }

  @SubscribeMessage('chat:leave')
  async onLeaveChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ChatRoomBody,
  ) {
    const chatId = this.getChatId(body);
    await client.leave(this.chatRoom(chatId));

    return { success: true, chatId };
  }

  @SubscribeMessage('message:send')
  async onSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: SocketSendMessageBody,
  ) {
    const userId = this.getSocketUserId(client);
    const chatId = this.getChatId(body);
    const content = body?.content?.trim();

    if (!content) {
      throw new WsException('Message content is required');
    }

    const message = await this.chatService.sendMessage(chatId, userId, {
      content,
      messageType: body.messageType,
      attachmentUrl: body.attachmentUrl,
      clientMessageId: body.clientMessageId,
    });

    return { success: true, chatId, message };
  }

  @SubscribeMessage('messages:read')
  async onMessagesRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: ChatRoomBody,
  ) {
    const userId = this.getSocketUserId(client);
    const chatId = this.getChatId(body);

    await this.chatService.markChatRead(chatId, userId);

    return { success: true, chatId };
  }

  private verifySocketToken(client: AuthenticatedSocket): JwtPayload {
    const token = (client.handshake.auth as Record<string, unknown>)?.token;

    if (!token || typeof token !== 'string') {
      throw new WsException('Missing auth token');
    }

    const payload = this.jwtService.verify<JwtPayload & { type?: string }>(
      token,
    );

    if (!payload.sub || (payload.type && payload.type !== 'access')) {
      throw new WsException('Invalid auth token');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      type: 'access',
    };
  }

  private getSocketUserId(client: AuthenticatedSocket): string {
    if (!client.data.userId) {
      throw new WsException('Socket is not authenticated');
    }

    return client.data.userId;
  }

  private getChatId(body: ChatRoomBody): string {
    const chatId = typeof body === 'string' ? body : body?.chatId;

    if (!chatId) {
      throw new WsException('chatId is required');
    }

    return chatId;
  }

  private userRoom = (userId: string) => `user:${userId}`;
  private chatRoom = (chatId: string) => `chat:${chatId}`;

  private emitChatMessage = (payload: ChatMessagePayload) => {
    const { chatId, message, participantIds = [], chat } = payload;
    const rooms = [
      this.chatRoom(chatId),
      ...participantIds.map(userId => this.userRoom(userId)),
    ];

    this.server.to(rooms).emit('message:new', {
      chatId,
      message,
    });

    if (chat) {
      this.server.to(rooms).emit('chat:updated', {
        chatId,
        chat,
        message,
      });
    }

    if (payload.recipientId) {
      this.server.to(this.userRoom(payload.recipientId)).emit('chat.message', {
        chatId,
        message,
      });
    }
  };

  private emitChatRead = (payload: ChatReadPayload) => {
    const { chatId, userId } = payload;
    this.server.to(this.chatRoom(chatId)).emit('messages:read', payload);
    this.server.to(this.userRoom(userId)).emit('chat:updated', {
      chatId,
      unreadCount: 0,
    });
  };

  private emitChatAccepted = (payload: ChatAcceptedPayload) => {
    const { chatId, playerId } = payload;
    if (playerId) {
      this.server.to(this.userRoom(playerId)).emit('chat.accepted', { chatId });
      this.server.to(this.userRoom(playerId)).emit('chat:updated', { chatId });
    }
  };

  private emitChatRequested = (payload: ChatRequestedPayload) => {
    const { chatId, scoutId, playerId } = payload;
    this.server.to(this.userRoom(scoutId)).emit('chat.requested', {
      chatId,
      playerId,
    });
    this.server.to(this.userRoom(scoutId)).emit('chat:updated', { chatId });
  };

  @OnEvent('chat.message')
  onChatMessage(payload: ChatMessagePayload) {
    this.emitChatMessage(payload);
  }

  @OnEvent('chat.read')
  onChatRead(payload: ChatReadPayload) {
    this.emitChatRead(payload);
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

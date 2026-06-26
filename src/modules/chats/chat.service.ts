import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { ReportChatDto, SendMessageDto, StartChatDto } from './dtos';
import {
  Block,
  Chat,
  ChatParticipant,
  Message,
  Report,
  User,
} from '@/database/entities';
import { MailService } from '@/integrations/mail/mail.service';
import { HttpError } from '@/common/utils';
import {
  NotificationPreferenceKey,
  NotificationPreferencesService,
} from '@/modules/settings';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(ChatParticipant)
    private readonly participantRepository: Repository<ChatParticipant>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    private readonly eventEmitter: EventEmitter2,
    private readonly mailService: MailService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}
  private getUserOrThrow = async (userId?: string) => {
    if (!userId) {
      throw HttpError.badRequest('Invalid user');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw HttpError.unauthorized('User not found');
    }

    return user;
  };

  startChat = async (initiatorId: string, dto: StartChatDto): Promise<Chat> => {
    const initiator = await this.getUserOrThrow(initiatorId);
    const isScoutInitiator = initiator.role === 'scout';
    const targetPlayerId = isScoutInitiator ? dto.playerId : undefined;
    const targetScoutId = !isScoutInitiator ? dto.scoutId : undefined;

    if (isScoutInitiator && !targetPlayerId) {
      throw HttpError.badRequest('playerId is required for scouts');
    }

    if (!isScoutInitiator && !targetScoutId) {
      throw HttpError.badRequest('scoutId is required for players');
    }

    const targetId = targetPlayerId || targetScoutId;
    const targetUser = await this.userRepository.findOne({
      where: { id: targetId },
    });

    if (!targetUser) {
      throw HttpError.notFound('Target user not found');
    }

    if (isScoutInitiator && targetUser.role !== 'player') {
      throw HttpError.badRequest('Scouts can only start chats with players');
    }

    if (!isScoutInitiator && targetUser.role !== 'scout') {
      throw HttpError.badRequest('Players can only request chats with scouts');
    }

    const scoutId = isScoutInitiator ? initiatorId : (targetScoutId as string);
    const playerId = isScoutInitiator
      ? (targetPlayerId as string)
      : initiatorId;

    const existing = await this.chatRepository.findOne({
      where: {
        scout: { id: scoutId },
        player: { id: playerId },
      },
      relations: ['participants', 'participants.user', 'scout', 'player'],
    });

    if (existing) {
      return existing;
    }

    const status = isScoutInitiator ? 'active' : 'pending';
    const initialMessage = !isScoutInitiator
      ? dto.initialMessage?.trim().slice(0, 1000)
      : undefined;
    const requestedAt = new Date();

    const chat = this.chatRepository.create({
      status,
      scout: { id: scoutId } as User,
      player: { id: playerId } as User,
      unreadCount: initialMessage ? 1 : 0,
      lastMessageAt: initialMessage ? requestedAt : null,
      lastMessagePreview: initialMessage ?? null,
    });

    const savedChat = await this.chatRepository.save(chat);

    const participants = [
      this.participantRepository.create({
        chat: savedChat,
        user: { id: scoutId } as User,
        unreadCount: initialMessage ? 1 : 0,
        status: status === 'active' ? 'active' : 'pending',
      }),
      this.participantRepository.create({
        chat: savedChat,
        user: { id: playerId } as User,
        unreadCount: 0,
        status: status === 'active' ? 'active' : 'pending',
      }),
    ];

    await this.participantRepository.save(participants);

    if (initialMessage) {
      await this.messageRepository.save(
        this.messageRepository.create({
          chat: savedChat,
          sender: { id: initiatorId } as User,
          content: initialMessage,
          messageType: 'text',
          attachmentUrl: null,
          readAt: null,
        }),
      );
    }

    const createdChat = await this.chatRepository.findOneOrFail({
      where: { id: savedChat.id },
      relations: ['participants', 'participants.user', 'scout', 'player'],
    });

    if (!isScoutInitiator) {
      const requesterName = this.getDisplayName(initiator);

      this.eventEmitter.emit('chat.requested', {
        scoutId,
        playerId,
        chatId: createdChat.id,
        chat: createdChat,
        message: initialMessage,
      });

      if (
        await this.shouldSendChatInAppNotification(
          scoutId,
          createdChat.id,
          'chatRequests',
        )
      ) {
        this.eventEmitter.emit('notification.create', {
          userId: scoutId,
          title: 'New chat request',
          message: initialMessage
            ? `${requesterName}: ${initialMessage}`
            : `${requesterName} requested to chat with you.`,
          type: 'message',
          referenceId: createdChat.id,
          preference: 'chatRequests',
        });
      }

      if (
        await this.notificationPreferencesService.allowsEmailNotification(
          scoutId,
          'chatRequests',
        )
      ) {
        this.sendBestEffortChatRequestEmail(
          targetUser.email,
          requesterName,
          initialMessage,
        );
      }
    }

    return createdChat;
  };

  acceptChat = async (chatId: string, scoutId: string): Promise<Chat> => {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['participants', 'participants.user', 'scout', 'player'],
    });

    if (!chat) {
      throw HttpError.notFound('Chat not found');
    }

    if (chat.scout?.id !== scoutId) {
      throw HttpError.forbidden('Only the scout can accept this chat');
    }

    if (chat.status !== 'pending') {
      return chat;
    }

    chat.status = 'active';
    await this.chatRepository.save(chat);

    await this.participantRepository
      .createQueryBuilder()
      .update(ChatParticipant)
      .set({ status: 'active' })
      .where('chat_id = :chatId', { chatId })
      .execute();

    this.eventEmitter.emit('chat.accepted', {
      chatId: chat.id,
      scoutId,
      playerId: chat.player?.id,
    });

    const playerId = chat.player?.id;
    if (playerId && playerId !== scoutId) {
      const scoutName = this.getDisplayName(chat.scout);

      if (
        await this.shouldSendChatInAppNotification(
          playerId,
          chat.id,
          'chatAccepted',
        )
      ) {
        this.eventEmitter.emit('notification.create', {
          userId: playerId,
          title: 'Chat request accepted',
          message: `${scoutName} accepted your chat request.`,
          type: 'message',
          referenceId: chat.id,
          preference: 'chatAccepted',
        });
      }

      if (
        chat.player?.email &&
        (await this.notificationPreferencesService.allowsEmailNotification(
          playerId,
          'chatAccepted',
        ))
      ) {
        this.sendBestEffortChatAcceptedEmail(chat.player.email, scoutName);
      }
    }

    return this.chatRepository.findOneOrFail({
      where: { id: chatId },
      relations: ['participants', 'participants.user', 'scout', 'player'],
    });
  };

  rejectChat = async (chatId: string, scoutId: string): Promise<Chat> => {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['participants', 'participants.user', 'scout', 'player'],
    });

    if (!chat) {
      throw HttpError.notFound('Chat not found');
    }

    if (chat.scout?.id !== scoutId) {
      throw HttpError.forbidden('Only the scout can reject this chat');
    }

    if (chat.status !== 'pending') {
      throw HttpError.badRequest('Only pending chat requests can be rejected');
    }

    chat.status = 'rejected';
    await this.chatRepository.save(chat);

    await this.participantRepository
      .createQueryBuilder()
      .update(ChatParticipant)
      .set({ status: 'rejected' })
      .where('chat_id = :chatId', { chatId })
      .execute();

    const playerId = chat.player?.id;
    const scoutName = this.getDisplayName(chat.scout);
    const rejectedChat = await this.chatRepository.findOneOrFail({
      where: { id: chatId },
      relations: ['participants', 'participants.user', 'scout', 'player'],
    });

    this.eventEmitter.emit('chat.rejected', {
      chatId: chat.id,
      scoutId,
      playerId,
      chat: rejectedChat,
    });

    if (playerId && playerId !== scoutId) {
      if (
        await this.shouldSendChatInAppNotification(
          playerId,
          chat.id,
          'chatRequests',
        )
      ) {
        this.eventEmitter.emit('notification.create', {
          userId: playerId,
          title: 'Chat request declined',
          message: `${scoutName} declined your chat request.`,
          type: 'message',
          referenceId: chat.id,
          preference: 'chatRequests',
        });
      }

      if (
        chat.player?.email &&
        (await this.notificationPreferencesService.allowsEmailNotification(
          playerId,
          'chatRequests',
        ))
      ) {
        this.sendBestEffortChatRejectedEmail(chat.player.email, scoutName);
      }
    }

    return rejectedChat;
  };

  getChats = async (userId: string): Promise<Chat[]> => {
    await this.getUserOrThrow(userId);

    return this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.scout', 'scout')
      .leftJoinAndSelect('chat.player', 'player')
      .leftJoinAndSelect('chat.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .where('scout.id = :userId OR player.id = :userId', { userId })
      .orderBy('chat.last_message_at', 'DESC')
      .getMany();
  };

  getChatById = async (chatId: string, userId: string): Promise<Chat> => {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['participants', 'participants.user', 'scout', 'player'],
    });

    if (!chat) {
      throw HttpError.notFound('Chat not found');
    }

    const isParticipant =
      chat.scout?.id === userId || chat.player?.id === userId;

    if (!isParticipant) {
      throw HttpError.forbidden('Not authorized to access this chat');
    }

    return chat;
  };

  getMessages = async (
    chatId: string,
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ data: Message[]; total: number }> => {
    const participant = await this.getParticipantOrThrow(chatId, userId);
    const where = this.getVisibleMessageWhere(chatId, participant.clearedAt);

    const [data, total] = await this.messageRepository.findAndCount({
      where,
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { data: data.reverse(), total };
  };

  sendMessage = async (
    chatId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<Message & { clientMessageId?: string }> => {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['scout', 'player', 'participants', 'participants.user'],
    });

    if (!chat) {
      throw HttpError.notFound('Chat not found');
    }

    const isParticipant =
      chat.scout?.id === senderId || chat.player?.id === senderId;

    if (!isParticipant) {
      throw HttpError.forbidden('Not authorized to send messages');
    }

    if (chat.status !== 'active') {
      throw HttpError.badRequest('Chat is pending approval');
    }

    const recipientId =
      chat.scout?.id === senderId ? chat.player?.id : chat.scout?.id;

    this.assertChatNotBlocked(chat, senderId, recipientId);

    const message = this.messageRepository.create({
      chat,
      sender: { id: senderId } as User,
      content: dto.content,
      messageType: dto.messageType ?? 'text',
      attachmentUrl: dto.attachmentUrl ?? null,
      readAt: null,
    });

    const savedMessage = await this.messageRepository.save(message);

    chat.lastMessageAt = new Date();
    chat.lastMessagePreview = dto.content?.slice(0, 120) ?? null;
    chat.unreadCount = (chat.unreadCount ?? 0) + 1;
    await this.chatRepository.save(chat);

    if (recipientId) {
      await this.participantRepository
        .createQueryBuilder()
        .update(ChatParticipant)
        .set({ unreadCount: () => 'unread_count + 1' })
        .where('chat_id = :chatId', { chatId })
        .andWhere('user_id = :recipientId', { recipientId })
        .execute();
    }

    const savedMessageWithSender = await this.messageRepository.findOneOrFail({
      where: { id: savedMessage.id },
      relations: ['sender', 'chat'],
    });
    const updatedChat = await this.chatRepository.findOneOrFail({
      where: { id: chatId },
      relations: ['participants', 'participants.user', 'scout', 'player'],
    });
    const participantIds = [chat.scout?.id, chat.player?.id].filter(
      (id): id is string => Boolean(id),
    );
    const messageWithClientId = Object.assign(savedMessageWithSender, {
      clientMessageId: dto.clientMessageId,
    });

    this.eventEmitter.emit('chat.message', {
      chatId,
      message: messageWithClientId,
      senderId,
      recipientId,
      participantIds,
      chat: updatedChat,
    });

    if (
      recipientId &&
      recipientId !== senderId &&
      (await this.shouldSendChatInAppNotification(
        recipientId,
        chatId,
        'chatMessages',
      ))
    ) {
      this.eventEmitter.emit('notification.create', {
        userId: recipientId,
        title: 'New message',
        message: `${this.getDisplayName(savedMessageWithSender.sender)}: ${dto.content}`,
        type: 'message',
        referenceId: chatId,
        preference: 'chatMessages',
      });
    }

    return messageWithClientId;
  };

  private getDisplayName(user?: User | null): string {
    return user?.username || user?.email || 'Someone';
  }

  private sendBestEffortChatRequestEmail(
    email: string | undefined,
    requesterName: string,
    messagePreview?: string,
  ): void {
    if (!email) return;

    void this.mailService
      .sendChatRequestEmail(email, requesterName, messagePreview)
      .catch(error => {
        this.logger.warn(
          `Failed to send chat request email: ${this.getErrorMessage(error)}`,
        );
      });
  }

  private sendBestEffortChatAcceptedEmail(
    email: string | undefined,
    scoutName: string,
  ): void {
    if (!email) return;

    void this.mailService
      .sendChatAcceptedEmail(email, scoutName)
      .catch(error => {
        this.logger.warn(
          `Failed to send chat accepted email: ${this.getErrorMessage(error)}`,
        );
      });
  }

  private sendBestEffortChatRejectedEmail(
    email: string | undefined,
    scoutName: string,
  ): void {
    if (!email) return;

    void this.mailService
      .sendChatRejectedEmail(email, scoutName)
      .catch(error => {
        this.logger.warn(
          `Failed to send chat rejected email: ${this.getErrorMessage(error)}`,
        );
      });
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  markChatRead = async (chatId: string, userId: string): Promise<void> => {
    await this.getChatById(chatId, userId);

    await this.participantRepository
      .createQueryBuilder()
      .update(ChatParticipant)
      .set({ unreadCount: 0 })
      .where('chat_id = :chatId', { chatId })
      .andWhere('user_id = :userId', { userId })
      .execute();

    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: () => 'NOW()' })
      .where('chat_id = :chatId', { chatId })
      .andWhere('sender_id != :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();

    this.eventEmitter.emit('chat.read', {
      chatId,
      userId,
    });
  };

  archiveChat = async (
    chatId: string,
    userId: string,
  ): Promise<ChatParticipant> => {
    await this.getChatById(chatId, userId);

    const participant = await this.participantRepository.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
      relations: ['chat', 'chat.scout', 'chat.player', 'user'],
    });

    if (!participant) {
      throw HttpError.notFound('Participant not found');
    }

    participant.status = 'archived';
    return this.participantRepository.save(participant);
  };

  blockChat = async (
    chatId: string,
    userId: string,
  ): Promise<ChatParticipant> => {
    await this.getChatById(chatId, userId);

    const participant = await this.participantRepository.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
      relations: ['chat', 'chat.scout', 'chat.player', 'user'],
    });

    if (!participant) {
      throw HttpError.notFound('Participant not found');
    }

    const otherUserId = this.getOtherUserId(participant.chat, userId);
    if (otherUserId) {
      const existingBlock = await this.blockRepository.findOne({
        where: { blockerId: userId, blockedId: otherUserId },
      });

      if (!existingBlock) {
        await this.blockRepository.save(
          this.blockRepository.create({
            blockerId: userId,
            blockedId: otherUserId,
          }),
        );
      }
    }

    participant.status = 'blocked';
    return this.participantRepository.save(participant);
  };

  setChatMuted = async (
    chatId: string,
    userId: string,
    muted: boolean,
  ): Promise<ChatParticipant> => {
    const participant = await this.getParticipantOrThrow(chatId, userId);
    participant.notificationsMuted = muted;
    return this.participantRepository.save(participant);
  };

  clearChat = async (chatId: string, userId: string): Promise<void> => {
    const participant = await this.getParticipantOrThrow(chatId, userId);
    participant.clearedAt = new Date();
    participant.unreadCount = 0;
    await this.participantRepository.save(participant);

    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: () => 'NOW()' })
      .where('chat_id = :chatId', { chatId })
      .andWhere('sender_id != :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();
  };

  reportChat = async (
    chatId: string,
    userId: string,
    dto: ReportChatDto,
  ): Promise<Report> => {
    const chat = await this.getChatById(chatId, userId);
    const reportedUserId = this.getOtherUserId(chat, userId);

    if (!reportedUserId) {
      throw HttpError.badRequest('Cannot identify chat participant to report');
    }

    const description =
      dto.description?.trim() ||
      'User reported from chat settings without additional details.';

    const report = this.reportRepository.create({
      reporter: { id: userId } as User,
      type: 'user',
      title: 'Chat participant report',
      description,
      severity: 'medium',
      reportedType: 'user',
      reportedId: reportedUserId,
      metadata: { chatId },
    });

    return this.reportRepository.save(report);
  };

  getChatMedia = async (chatId: string, userId: string): Promise<Message[]> => {
    const participant = await this.getParticipantOrThrow(chatId, userId);
    const where = this.getVisibleMessageWhere(chatId, participant.clearedAt);

    return this.messageRepository.find({
      where: {
        ...where,
        attachmentUrl: Not(IsNull()),
      },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  };

  private getVisibleMessageWhere(
    chatId: string,
    clearedAt?: Date | null,
  ): FindOptionsWhere<Message> {
    return {
      chat: { id: chatId },
      ...(clearedAt ? { createdAt: MoreThan(clearedAt) } : {}),
    };
  }

  private async getParticipantOrThrow(
    chatId: string,
    userId: string,
  ): Promise<ChatParticipant> {
    await this.getChatById(chatId, userId);

    const participant = await this.participantRepository.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
      relations: ['chat', 'chat.scout', 'chat.player', 'user'],
    });

    if (!participant) {
      throw HttpError.notFound('Participant not found');
    }

    return participant;
  }

  private async shouldSendChatInAppNotification(
    userId: string,
    chatId: string,
    preference: NotificationPreferenceKey,
  ): Promise<boolean> {
    const allowed =
      await this.notificationPreferencesService.allowsInAppNotification(
        userId,
        preference,
      );

    if (!allowed) {
      return false;
    }

    const participant = await this.participantRepository.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
    });

    return !participant?.notificationsMuted;
  }

  private assertChatNotBlocked(
    chat: Chat,
    senderId: string,
    recipientId?: string,
  ) {
    const participants = chat.participants ?? [];
    const senderParticipant = participants.find(
      participant => participant.user?.id === senderId,
    );
    const recipientParticipant = participants.find(
      participant => participant.user?.id === recipientId,
    );

    if (
      senderParticipant?.status === 'blocked' ||
      recipientParticipant?.status === 'blocked'
    ) {
      throw HttpError.forbidden('Chat is blocked');
    }
  }

  private getOtherUserId(chat: Chat, userId: string): string | undefined {
    if (chat.scout?.id === userId) {
      return chat.player?.id;
    }

    if (chat.player?.id === userId) {
      return chat.scout?.id;
    }

    return undefined;
  }
}

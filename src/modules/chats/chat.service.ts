import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SendMessageDto, StartChatDto } from './dtos';
import { Chat, ChatParticipant, Message, User } from '@/database/entities';
import { HttpError } from '@/common/utils';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(ChatParticipant)
    private readonly participantRepository: Repository<ChatParticipant>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
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
      relations: ['participants', 'scout', 'player'],
    });

    if (existing) {
      return existing;
    }

    const status = isScoutInitiator ? 'active' : 'pending';

    const chat = this.chatRepository.create({
      type: 'direct',
      status,
      scout: { id: scoutId } as User,
      player: { id: playerId } as User,
      unread_count: 0,
      last_message_at: null,
      last_message_preview: null,
    });

    const savedChat = await this.chatRepository.save(chat);

    const participants = [
      this.participantRepository.create({
        chat: savedChat,
        user: { id: scoutId } as User,
        unread_count: 0,
        status: status === 'active' ? 'active' : 'pending',
      }),
      this.participantRepository.create({
        chat: savedChat,
        user: { id: playerId } as User,
        unread_count: 0,
        status: status === 'active' ? 'active' : 'pending',
      }),
    ];

    await this.participantRepository.save(participants);

    if (!isScoutInitiator) {
      this.eventEmitter.emit('chat.requested', {
        scoutId,
        playerId,
        chatId: savedChat.id,
      });
    }

    return this.chatRepository.findOneOrFail({
      where: { id: savedChat.id },
      relations: ['participants', 'scout', 'player'],
    });
  };

  acceptChat = async (chatId: string, scoutId: string): Promise<Chat> => {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['participants', 'scout', 'player'],
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

    return this.chatRepository.findOneOrFail({
      where: { id: chatId },
      relations: ['participants', 'scout', 'player'],
    });
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
      relations: ['participants', 'scout', 'player'],
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
    await this.getChatById(chatId, userId);

    const [data, total] = await this.messageRepository.findAndCount({
      where: { chat: { id: chatId } },
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
  ): Promise<Message> => {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['scout', 'player'],
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

    const message = this.messageRepository.create({
      chat,
      sender: { id: senderId } as User,
      content: dto.content,
      message_type: dto.messageType ?? 'text',
      attachment_url: dto.attachmentUrl ?? null,
      read_at: null,
    });

    const savedMessage = await this.messageRepository.save(message);

    chat.last_message_at = new Date();
    chat.last_message_preview = dto.content?.slice(0, 120) ?? null;
    chat.unread_count = (chat.unread_count ?? 0) + 1;
    await this.chatRepository.save(chat);

    const recipientId =
      chat.scout?.id === senderId ? chat.player?.id : chat.scout?.id;

    if (recipientId) {
      await this.participantRepository
        .createQueryBuilder()
        .update(ChatParticipant)
        .set({ unread_count: () => 'unread_count + 1' })
        .where('chat_id = :chatId', { chatId })
        .andWhere('user_id = :recipientId', { recipientId })
        .execute();
    }

    this.eventEmitter.emit('chat.message', {
      chatId,
      message: savedMessage,
      senderId,
      recipientId,
    });

    return savedMessage;
  };

  markChatRead = async (chatId: string, userId: string): Promise<void> => {
    await this.getChatById(chatId, userId);

    await this.participantRepository
      .createQueryBuilder()
      .update(ChatParticipant)
      .set({ unread_count: 0 })
      .where('chat_id = :chatId', { chatId })
      .andWhere('user_id = :userId', { userId })
      .execute();

    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ read_at: () => 'NOW()' })
      .where('chat_id = :chatId', { chatId })
      .andWhere('sender_id != :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();
  };

  archiveChat = async (
    chatId: string,
    userId: string,
  ): Promise<ChatParticipant> => {
    await this.getChatById(chatId, userId);

    const participant = await this.participantRepository.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
      relations: ['chat', 'user'],
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
      relations: ['chat', 'user'],
    });

    if (!participant) {
      throw HttpError.notFound('Participant not found');
    }

    participant.status = 'blocked';
    return this.participantRepository.save(participant);
  };
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SendMessageDto, StartChatDto } from './dtos';
import { Chat, ChatParticipant, Message, User } from '@/database/entities';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(ChatParticipant)
    private readonly participantRepository: Repository<ChatParticipant>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async startChat(scoutId: string, dto: StartChatDto): Promise<Chat> {
    if (!scoutId) {
      throw new BadRequestException('Invalid user');
    }

    const existing = await this.chatRepository.findOne({
      where: {
        scout: { id: scoutId },
        player: { id: dto.playerId },
      },
      relations: ['participants', 'scout', 'player'],
    });

    if (existing) {
      return existing;
    }

    const chat = this.chatRepository.create({
      type: 'direct',
      status: 'active',
      scout: { id: scoutId } as User,
      player: { id: dto.playerId } as User,
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
        status: 'active',
      }),
      this.participantRepository.create({
        chat: savedChat,
        user: { id: dto.playerId } as User,
        unread_count: 0,
        status: 'active',
      }),
    ];

    await this.participantRepository.save(participants);

    return this.chatRepository.findOneOrFail({
      where: { id: savedChat.id },
      relations: ['participants', 'scout', 'player'],
    });
  }

  async getChats(userId: string): Promise<Chat[]> {
    if (!userId) {
      throw new BadRequestException('Invalid user');
    }

    return this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.scout', 'scout')
      .leftJoinAndSelect('chat.player', 'player')
      .leftJoinAndSelect('chat.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .where('scout.id = :userId OR player.id = :userId', { userId })
      .orderBy('chat.last_message_at', 'DESC')
      .getMany();
  }

  async getChatById(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['participants', 'scout', 'player'],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const isParticipant =
      chat.scout?.id === userId || chat.player?.id === userId;

    if (!isParticipant) {
      throw new BadRequestException('Not authorized to access this chat');
    }

    return chat;
  }

  async getMessages(
    chatId: string,
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ data: Message[]; total: number }> {
    await this.getChatById(chatId, userId);

    const [data, total] = await this.messageRepository.findAndCount({
      where: { chat: { id: chatId } },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { data: data.reverse(), total };
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['scout', 'player'],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const isParticipant =
      chat.scout?.id === senderId || chat.player?.id === senderId;

    if (!isParticipant) {
      throw new BadRequestException('Not authorized to send messages');
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

    return savedMessage;
  }

  async markChatRead(chatId: string, userId: string): Promise<void> {
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
  }

  async archiveChat(chatId: string, userId: string): Promise<ChatParticipant> {
    await this.getChatById(chatId, userId);

    const participant = await this.participantRepository.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
      relations: ['chat', 'user'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.status = 'archived';
    return this.participantRepository.save(participant);
  }

  async blockChat(chatId: string, userId: string): Promise<ChatParticipant> {
    await this.getChatById(chatId, userId);

    const participant = await this.participantRepository.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
      relations: ['chat', 'user'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.status = 'blocked';
    return this.participantRepository.save(participant);
  }
}

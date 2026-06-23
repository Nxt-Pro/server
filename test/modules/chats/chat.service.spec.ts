import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Chat, ChatParticipant, Message, User } from '@/database/entities';
import { MailService } from '@/integrations/mail/mail.service';
import { ChatService } from '@/modules/chats/chat.service';

const createUpdateQueryBuilder = () => {
  const qb = {
    update: jest.fn(),
    set: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  qb.update.mockReturnValue(qb);
  qb.set.mockReturnValue(qb);
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);

  return qb;
};

describe('ChatService notifications', () => {
  let chatRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
  };
  let participantRepository: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let messageRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneOrFail: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let mailService: {
    sendChatRequestEmail: jest.Mock;
    sendChatAcceptedEmail: jest.Mock;
  };
  let service: ChatService;

  const player = {
    id: 'player_1',
    email: 'player@nxtpro.dev',
    username: 'Player One',
    role: 'player',
  } as User;
  const scout = {
    id: 'scout_1',
    email: 'scout@nxtpro.dev',
    username: 'Scout One',
    role: 'scout',
  } as User;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    chatRepository = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({ id: 'chat_1' }),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
    };
    participantRepository = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => createUpdateQueryBuilder()),
    };
    messageRepository = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({ id: 'message_1' }),
      findOneOrFail: jest.fn(),
    };
    userRepository = {
      findOne: jest.fn(({ where }: { where: { id: string } }) => {
        if (where.id === player.id) return Promise.resolve(player);
        if (where.id === scout.id) return Promise.resolve(scout);
        return Promise.resolve(null);
      }),
    };
    eventEmitter = { emit: jest.fn() };
    mailService = {
      sendChatRequestEmail: jest.fn().mockResolvedValue(undefined),
      sendChatAcceptedEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new ChatService(
      chatRepository as unknown as Repository<Chat>,
      participantRepository as unknown as Repository<ChatParticipant>,
      messageRepository as unknown as Repository<Message>,
      userRepository as unknown as Repository<User>,
      eventEmitter as unknown as EventEmitter2,
      mailService as unknown as MailService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a scout notification and best-effort email for player chat requests', async () => {
    const createdChat = {
      id: 'chat_1',
      status: 'pending',
      scout,
      player,
      participants: [],
    } as Chat;

    chatRepository.findOne.mockResolvedValue(null);
    chatRepository.findOneOrFail.mockResolvedValue(createdChat);

    await service.startChat(player.id, {
      scoutId: scout.id,
      initialMessage: 'Can we talk?',
    });

    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: scout.id,
      title: 'New chat request',
      message: 'Player One: Can we talk?',
      type: 'message',
      referenceId: createdChat.id,
    });
    expect(mailService.sendChatRequestEmail).toHaveBeenCalledWith(
      scout.email,
      'Player One',
      'Can we talk?',
    );
  });

  it('notifies the player and sends best-effort email when a scout accepts', async () => {
    const chat = {
      id: 'chat_1',
      status: 'pending',
      scout,
      player,
      participants: [],
    } as Chat;
    const activeChat = { ...chat, status: 'active' } as Chat;

    chatRepository.findOne.mockResolvedValue(chat);
    chatRepository.findOneOrFail.mockResolvedValue(activeChat);

    await service.acceptChat(chat.id, scout.id);

    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: player.id,
      title: 'Chat request accepted',
      message: 'Scout One accepted your chat request.',
      type: 'message',
      referenceId: chat.id,
    });
    expect(mailService.sendChatAcceptedEmail).toHaveBeenCalledWith(
      player.email,
      'Scout One',
    );
  });

  it('creates new message notifications only for the other chat participant', async () => {
    const chat = {
      id: 'chat_1',
      status: 'active',
      scout,
      player,
      unreadCount: 0,
      lastMessagePreview: null,
      lastMessageAt: null,
    } as Chat;
    const savedMessage = {
      id: 'message_1',
      chat,
      sender: scout,
      content: 'Welcome aboard',
      messageType: 'text',
      attachmentUrl: null,
      readAt: null,
    } as Message;

    chatRepository.findOne.mockResolvedValue(chat);
    chatRepository.findOneOrFail.mockResolvedValue({
      ...chat,
      participants: [],
    });
    messageRepository.findOneOrFail.mockResolvedValue(savedMessage);

    await service.sendMessage(chat.id, scout.id, {
      content: 'Welcome aboard',
      messageType: 'text',
    });

    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: player.id,
      title: 'New message',
      message: 'Scout One: Welcome aboard',
      type: 'message',
      referenceId: chat.id,
    });
    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({ userId: scout.id }),
    );
    expect(mailService.sendChatRequestEmail).not.toHaveBeenCalled();
    expect(mailService.sendChatAcceptedEmail).not.toHaveBeenCalled();
  });
});

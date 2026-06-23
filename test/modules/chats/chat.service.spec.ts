import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import {
  Block,
  Chat,
  ChatParticipant,
  Message,
  Report,
  User,
} from '@/database/entities';
import { MailService } from '@/integrations/mail/mail.service';
import { ChatService } from '@/modules/chats/chat.service';
import { NotificationPreferencesService } from '@/modules/settings';

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
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let messageRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
    find: jest.Mock;
    findOneOrFail: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let mailService: {
    sendChatRequestEmail: jest.Mock;
    sendChatAcceptedEmail: jest.Mock;
  };
  let reportRepository: { create: jest.Mock; save: jest.Mock };
  let blockRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let notificationPreferencesService: {
    allowsInAppNotification: jest.Mock;
    allowsEmailNotification: jest.Mock;
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
      findOne: jest.fn().mockResolvedValue({
        id: 'participant_1',
        notificationsMuted: false,
        status: 'active',
        chat: { id: 'chat_1', scout, player },
        user: scout,
      }),
      createQueryBuilder: jest.fn(() => createUpdateQueryBuilder()),
    };
    messageRepository = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({ id: 'message_1' }),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      find: jest.fn().mockResolvedValue([]),
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
    reportRepository = {
      create: jest.fn().mockReturnValue({ id: 'report_1' }),
      save: jest.fn().mockResolvedValue({ id: 'report_1' }),
    };
    blockRepository = {
      create: jest.fn().mockReturnValue({ id: 'block_1' }),
      save: jest.fn().mockResolvedValue({ id: 'block_1' }),
      findOne: jest.fn().mockResolvedValue(null),
    };
    notificationPreferencesService = {
      allowsInAppNotification: jest.fn().mockResolvedValue(true),
      allowsEmailNotification: jest.fn().mockResolvedValue(true),
    };

    service = new ChatService(
      chatRepository as unknown as Repository<Chat>,
      participantRepository as unknown as Repository<ChatParticipant>,
      messageRepository as unknown as Repository<Message>,
      userRepository as unknown as Repository<User>,
      reportRepository as unknown as Repository<Report>,
      blockRepository as unknown as Repository<Block>,
      eventEmitter as unknown as EventEmitter2,
      mailService as unknown as MailService,
      notificationPreferencesService as unknown as NotificationPreferencesService,
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
      preference: 'chatRequests',
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
      preference: 'chatAccepted',
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
      preference: 'chatMessages',
    });
    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({ userId: scout.id }),
    );
    expect(mailService.sendChatRequestEmail).not.toHaveBeenCalled();
    expect(mailService.sendChatAcceptedEmail).not.toHaveBeenCalled();
  });

  it('suppresses chat request in-app notifications when disabled', async () => {
    const createdChat = {
      id: 'chat_1',
      status: 'pending',
      scout,
      player,
      participants: [],
    } as Chat;

    notificationPreferencesService.allowsInAppNotification.mockResolvedValue(
      false,
    );
    chatRepository.findOne.mockResolvedValue(null);
    chatRepository.findOneOrFail.mockResolvedValue(createdChat);

    await service.startChat(player.id, {
      scoutId: scout.id,
      initialMessage: 'Can we talk?',
    });

    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      'notification.create',
      expect.anything(),
    );
    expect(mailService.sendChatRequestEmail).toHaveBeenCalled();
  });

  it('suppresses chat request and accepted emails when email notifications are disabled', async () => {
    const createdChat = {
      id: 'chat_1',
      status: 'pending',
      scout,
      player,
      participants: [],
    } as Chat;
    const activeChat = { ...createdChat, status: 'active' } as Chat;

    notificationPreferencesService.allowsEmailNotification.mockResolvedValue(
      false,
    );
    chatRepository.findOne.mockResolvedValueOnce(null);
    chatRepository.findOneOrFail.mockResolvedValueOnce(createdChat);

    await service.startChat(player.id, {
      scoutId: scout.id,
      initialMessage: 'Can we talk?',
    });

    chatRepository.findOne.mockResolvedValueOnce(createdChat);
    chatRepository.findOneOrFail.mockResolvedValueOnce(activeChat);

    await service.acceptChat(createdChat.id, scout.id);

    expect(mailService.sendChatRequestEmail).not.toHaveBeenCalled();
    expect(mailService.sendChatAcceptedEmail).not.toHaveBeenCalled();
  });

  it('suppresses new message in-app notifications when chat messages are disabled', async () => {
    const chat = {
      id: 'chat_1',
      status: 'active',
      scout,
      player,
      participants: [],
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

    notificationPreferencesService.allowsInAppNotification.mockResolvedValue(
      false,
    );
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

    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      'notification.create',
      expect.anything(),
    );
  });

  it('updates per-chat mute settings', async () => {
    const participant = {
      id: 'participant_1',
      notificationsMuted: false,
      chat: { id: 'chat_1', scout, player },
      user: scout,
    } as ChatParticipant;

    chatRepository.findOne.mockResolvedValue({
      id: 'chat_1',
      scout,
      player,
    });
    participantRepository.findOne.mockResolvedValue(participant);
    participantRepository.save.mockResolvedValue({
      ...participant,
      notificationsMuted: true,
    });

    await service.setChatMuted('chat_1', scout.id, true);

    expect(participantRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ notificationsMuted: true }),
    );
  });

  it('loads messages with cleared history filtering through repository find options', async () => {
    const clearedAt = new Date('2026-06-23T12:00:00.000Z');
    const participant = {
      id: 'participant_1',
      clearedAt,
      chat: { id: 'chat_1', scout, player },
      user: scout,
    } as ChatParticipant;
    const messages = [
      {
        id: 'message_1',
        content: 'After clear',
        sender: player,
      },
    ] as Message[];

    chatRepository.findOne.mockResolvedValue({
      id: 'chat_1',
      scout,
      player,
    });
    participantRepository.findOne.mockResolvedValue(participant);
    messageRepository.findAndCount.mockResolvedValue([messages, 1]);

    const result = await service.getMessages('chat_1', scout.id, 25, 5);

    expect(messageRepository.findAndCount).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: messages, total: 1 });
  });
});

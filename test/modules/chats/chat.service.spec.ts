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
import { ChatService } from '@/modules/chats/chat.service';
import { HttpError } from '@/common/utils';

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
  let reportRepository: { create: jest.Mock; save: jest.Mock };
  let blockRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
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
    reportRepository = {
      create: jest.fn().mockReturnValue({ id: 'report_1' }),
      save: jest.fn().mockResolvedValue({ id: 'report_1' }),
    };
    blockRepository = {
      create: jest.fn().mockReturnValue({ id: 'block_1' }),
      save: jest.fn().mockResolvedValue({ id: 'block_1' }),
      findOne: jest.fn().mockResolvedValue(null),
    };
    service = new ChatService(
      chatRepository as unknown as Repository<Chat>,
      participantRepository as unknown as Repository<ChatParticipant>,
      messageRepository as unknown as Repository<Message>,
      userRepository as unknown as Repository<User>,
      reportRepository as unknown as Repository<Report>,
      blockRepository as unknown as Repository<Block>,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a central delivery payload for player chat requests', async () => {
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

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({
        userId: scout.id,
        actorId: player.id,
        title: 'New chat request',
        message: 'Player One: Can we talk?',
        type: 'chat_request',
        referenceId: createdChat.id,
        referenceType: 'chat',
        preference: 'chatRequests',
        dedupeKey: `chat_request:${createdChat.id}`,
        email: {
          to: scout.email,
          subject: 'New chat request on NxtPro',
          message: 'Player One: Can we talk?',
        },
      }),
    );
  });

  it('notifies the player through central delivery when a scout accepts', async () => {
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

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({
        userId: player.id,
        actorId: scout.id,
        title: 'Chat request accepted',
        message: 'Scout One accepted your chat request.',
        type: 'chat_accepted',
        referenceId: chat.id,
        referenceType: 'chat',
        preference: 'chatAccepted',
        dedupeKey: `chat_accepted:${chat.id}`,
        email: {
          to: player.email,
          subject: 'Your NxtPro chat request was accepted',
          message: 'Scout One accepted your chat request on NxtPro.',
        },
      }),
    );
  });

  it('rejects pending chat requests and notifies the requester', async () => {
    const chat = {
      id: 'chat_1',
      status: 'pending',
      scout,
      player,
      participants: [],
    } as Chat;
    const rejectedChat = { ...chat, status: 'rejected' } as Chat;

    chatRepository.findOne.mockResolvedValue(chat);
    chatRepository.findOneOrFail.mockResolvedValue(rejectedChat);

    const result = await service.rejectChat(chat.id, scout.id);

    expect(result.status).toBe('rejected');
    expect(chatRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected' }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({
        userId: player.id,
        actorId: scout.id,
        title: 'Chat request declined',
        message: 'Scout One declined your chat request.',
        type: 'chat_request',
        referenceId: chat.id,
        referenceType: 'chat',
        preference: 'chatRequests',
        dedupeKey: `chat_rejected:${chat.id}`,
        email: {
          to: player.email,
          subject: 'Your NxtPro chat request was declined',
          message: 'Scout One declined your chat request on NxtPro.',
        },
      }),
    );
  });

  it('only allows the scout recipient to reject a pending chat request', async () => {
    const chat = {
      id: 'chat_1',
      status: 'pending',
      scout,
      player,
      participants: [],
    } as Chat;

    chatRepository.findOne.mockResolvedValue(chat);

    await expect(service.rejectChat(chat.id, player.id)).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(chatRepository.save).not.toHaveBeenCalled();
  });

  it('does not reject accepted chat requests', async () => {
    const chat = {
      id: 'chat_1',
      status: 'active',
      scout,
      player,
      participants: [],
    } as Chat;

    chatRepository.findOne.mockResolvedValue(chat);

    await expect(service.rejectChat(chat.id, scout.id)).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(chatRepository.save).not.toHaveBeenCalled();
  });

  it('suppresses chat rejection notifications when the requester muted the chat', async () => {
    const chat = {
      id: 'chat_1',
      status: 'pending',
      scout,
      player,
      participants: [],
    } as Chat;
    const rejectedChat = { ...chat, status: 'rejected' } as Chat;

    chatRepository.findOne.mockResolvedValue(chat);
    chatRepository.findOneOrFail.mockResolvedValue(rejectedChat);
    participantRepository.findOne.mockResolvedValue({
      id: 'participant_1',
      notificationsMuted: true,
    });

    await service.rejectChat(chat.id, scout.id);

    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      'notification.create',
      expect.anything(),
    );
  });

  it('does not fail rejection after emitting central delivery intent', async () => {
    const chat = {
      id: 'chat_1',
      status: 'pending',
      scout,
      player,
      participants: [],
    } as Chat;
    const rejectedChat = { ...chat, status: 'rejected' } as Chat;

    chatRepository.findOne.mockResolvedValue(chat);
    chatRepository.findOneOrFail.mockResolvedValue(rejectedChat);

    await expect(service.rejectChat(chat.id, scout.id)).resolves.toBe(
      rejectedChat,
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

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({
        userId: player.id,
        actorId: scout.id,
        title: 'New message',
        message: 'Scout One: Welcome aboard',
        type: 'chat_message',
        referenceId: chat.id,
        referenceType: 'chat',
        preference: 'chatMessages',
        data: {
          chatId: chat.id,
          messageId: 'message_1',
          senderId: scout.id,
        },
      }),
    );
    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({ userId: scout.id }),
    );
  });

  it('suppresses chat request notifications when the recipient muted the chat', async () => {
    const createdChat = {
      id: 'chat_1',
      status: 'pending',
      scout,
      player,
      participants: [],
    } as Chat;

    chatRepository.findOne.mockResolvedValue(null);
    chatRepository.findOneOrFail.mockResolvedValue(createdChat);
    participantRepository.findOne.mockResolvedValue({
      id: 'participant_1',
      notificationsMuted: true,
    });

    await service.startChat(player.id, {
      scoutId: scout.id,
      initialMessage: 'Can we talk?',
    });

    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      'notification.create',
      expect.anything(),
    );
  });

  it('includes email payloads for chat request and accepted notifications', async () => {
    const createdChat = {
      id: 'chat_1',
      status: 'pending',
      scout,
      player,
      participants: [],
    } as Chat;
    const activeChat = { ...createdChat, status: 'active' } as Chat;

    chatRepository.findOne.mockResolvedValueOnce(null);
    chatRepository.findOneOrFail.mockResolvedValueOnce(createdChat);

    await service.startChat(player.id, {
      scoutId: scout.id,
      initialMessage: 'Can we talk?',
    });

    chatRepository.findOne.mockResolvedValueOnce(createdChat);
    chatRepository.findOneOrFail.mockResolvedValueOnce(activeChat);

    await service.acceptChat(createdChat.id, scout.id);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({
        type: 'chat_request',
        email: {
          to: scout.email,
          subject: 'New chat request on NxtPro',
          message: 'Player One: Can we talk?',
        },
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({
        type: 'chat_accepted',
        email: {
          to: player.email,
          subject: 'Your NxtPro chat request was accepted',
          message: 'Scout One accepted your chat request on NxtPro.',
        },
      }),
    );
  });

  it('suppresses new message notifications when the recipient muted the chat', async () => {
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

    chatRepository.findOne.mockResolvedValue(chat);
    chatRepository.findOneOrFail.mockResolvedValue({
      ...chat,
      participants: [],
    });
    messageRepository.findOneOrFail.mockResolvedValue(savedMessage);
    participantRepository.findOne.mockResolvedValue({
      id: 'participant_1',
      notificationsMuted: true,
    });

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

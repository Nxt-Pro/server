import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import {
  ReportChatDto,
  SendMessageDto,
  StartChatDto,
  UpdateChatMuteDto,
} from './dtos';
import { CurrentUser } from '@/common/decorators';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('start')
  async startChat(
    @CurrentUser('sub') userId: string,
    @Body() dto: StartChatDto,
  ) {
    return this.chatService.startChat(userId, dto);
  }

  @Patch(':id/accept')
  async acceptChat(
    @CurrentUser('sub') userId: string,
    @Param('id') chatId: string,
  ) {
    return this.chatService.acceptChat(chatId, userId);
  }

  @Get()
  async getChats(@CurrentUser('sub') userId: string) {
    return this.chatService.getChats(userId);
  }

  @Get(':id')
  async getChatById(
    @CurrentUser('sub') userId: string,
    @Param('id') chatId: string,
  ) {
    return this.chatService.getChatById(chatId, userId);
  }

  @Get(':id/messages')
  async getMessages(
    @CurrentUser('sub') userId: string,
    @Param('id') chatId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.chatService.getMessages(
      chatId,
      userId,
      Number(limit),
      Number(offset),
    );
  }

  @Post(':id/message')
  async sendMessage(
    @CurrentUser('sub') userId: string,
    @Param('id') chatId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(chatId, userId, dto);
  }

  @Post(':id/read')
  async markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('id') chatId: string,
  ) {
    await this.chatService.markChatRead(chatId, userId);
    return { success: true };
  }

  @Patch(':id/archive')
  async archiveChat(
    @CurrentUser('sub') userId: string,
    @Param('id') chatId: string,
  ) {
    return this.chatService.archiveChat(chatId, userId);
  }

  @Patch(':id/block')
  async blockChat(
    @CurrentUser('sub') userId: string,
    @Param('id') chatId: string,
  ) {
    return this.chatService.blockChat(chatId, userId);
  }

  @Patch(':id/mute')
  async muteChat(
    @CurrentUser('sub') userId: string,
    @Param('id') chatId: string,
    @Body() dto: UpdateChatMuteDto,
  ) {
    return this.chatService.setChatMuted(chatId, userId, dto.muted);
  }

  @Post(':id/clear')
  async clearChat(
    @CurrentUser('sub') userId: string,
    @Param('id') chatId: string,
  ) {
    await this.chatService.clearChat(chatId, userId);
    return { success: true };
  }

  @Post(':id/report')
  async reportChat(
    @CurrentUser('sub') userId: string,
    @Param('id') chatId: string,
    @Body() dto: ReportChatDto,
  ) {
    return this.chatService.reportChat(chatId, userId, dto);
  }

  @Get(':id/media')
  async getChatMedia(
    @CurrentUser('sub') userId: string,
    @Param('id') chatId: string,
  ) {
    return this.chatService.getChatMedia(chatId, userId);
  }
}

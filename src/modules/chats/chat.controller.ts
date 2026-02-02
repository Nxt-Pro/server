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
import { SendMessageDto, StartChatDto } from './dtos';
import { CurrentUser } from '@/common/decorators';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('start')
  async startChat(
    @CurrentUser() user: { id: string },
    @Body() dto: StartChatDto,
  ) {
    return this.chatService.startChat(user?.id, dto);
  }

  @Patch(':id/accept')
  async acceptChat(
    @CurrentUser() user: { id: string },
    @Param('id') chatId: string,
  ) {
    return this.chatService.acceptChat(chatId, user?.id);
  }

  @Get()
  async getChats(@CurrentUser() user: { id: string }) {
    return this.chatService.getChats(user?.id);
  }

  @Get(':id')
  async getChatById(
    @CurrentUser() user: { id: string },
    @Param('id') chatId: string,
  ) {
    return this.chatService.getChatById(chatId, user?.id);
  }

  @Get(':id/messages')
  async getMessages(
    @CurrentUser() user: { id: string },
    @Param('id') chatId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.chatService.getMessages(
      chatId,
      user?.id,
      Number(limit),
      Number(offset),
    );
  }

  @Post(':id/message')
  async sendMessage(
    @CurrentUser() user: { id: string },
    @Param('id') chatId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(chatId, user?.id, dto);
  }

  @Post(':id/read')
  async markAsRead(
    @CurrentUser() user: { id: string },
    @Param('id') chatId: string,
  ) {
    await this.chatService.markChatRead(chatId, user?.id);
    return { success: true };
  }

  @Patch(':id/archive')
  async archiveChat(
    @CurrentUser() user: { id: string },
    @Param('id') chatId: string,
  ) {
    return this.chatService.archiveChat(chatId, user?.id);
  }

  @Patch(':id/block')
  async blockChat(
    @CurrentUser() user: { id: string },
    @Param('id') chatId: string,
  ) {
    return this.chatService.blockChat(chatId, user?.id);
  }
}

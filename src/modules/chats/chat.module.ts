import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatsGateway } from './chats.gateway';
import { Chat, ChatParticipant, Message, User } from '@/database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatParticipant, Message, User])],
  providers: [ChatService, ChatsGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}

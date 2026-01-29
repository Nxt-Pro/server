import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Chat, ChatParticipant, Message } from '@/database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatParticipant, Message])],
  providers: [ChatService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}

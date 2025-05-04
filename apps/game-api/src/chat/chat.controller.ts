import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  sendMessage(@Body() body: any) {
    return this.chatService.sendMessage(body);
  }

  @Get(':gameId')
  getChatHistory(@Param('gameId') gameId: string) {
    return this.chatService.getChatHistory(gameId);
  }
}

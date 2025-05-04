import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sendMessage(data: any) {
    return { message: 'Send a chat message endpoint' };
  }

  getChatHistory(gameId: string) {
    return { message: `Get chat history endpoint for game ${gameId}` };
  }
}

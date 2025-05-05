import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageResponseDto {
  @ApiProperty({ description: 'Unique identifier for the chat message' })
  id: string;

  @ApiProperty({ description: 'The game ID this message belongs to' })
  gameId: string;

  @ApiPropertyOptional({
    description: 'The user ID of the sender (null for AI messages)',
  })
  userId?: string;

  @ApiPropertyOptional({ description: 'The username of the sender' })
  username?: string;

  @ApiProperty({ description: 'Whether this message is from the AI assistant' })
  isAi: boolean;

  @ApiProperty({ description: 'The message content' })
  message: string;

  @ApiProperty({ description: 'Timestamp when the message was created' })
  createdAt: Date;
}

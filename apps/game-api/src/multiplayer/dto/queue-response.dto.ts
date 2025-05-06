import { ApiProperty } from '@nestjs/swagger';
import { GameType } from './join-queue.dto';

export class QueueResponseDto {
  @ApiProperty({
    description: 'Queue entry ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  queueId: string;

  @ApiProperty({
    description: 'Status of the queue entry',
    example: 'waiting',
    enum: ['waiting', 'matched', 'expired'],
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp when the user joined the queue',
    example: '2023-07-15T14:30:00.000Z',
  })
  joinedAt: string;

  @ApiProperty({
    description: 'Estimated wait time in seconds',
    example: 45,
  })
  estimatedWaitTimeSeconds: number;

  @ApiProperty({
    description: 'Position in queue',
    example: 3,
  })
  position: number;

  @ApiProperty({
    description: 'Total number of players in queue',
    example: 12,
  })
  totalInQueue: number;

  @ApiProperty({
    description: 'Type of game',
    example: 'chess',
    enum: GameType,
  })
  gameType: GameType;

  @ApiProperty({
    description: 'Game ID if match was found',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  gameId?: string;

  @ApiProperty({
    description: 'Whether the user is in queue',
    example: true,
  })
  inQueue: boolean;
}

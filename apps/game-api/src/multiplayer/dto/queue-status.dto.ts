import { ApiProperty } from '@nestjs/swagger';
import { GameType } from './join-queue.dto';

export class QueueStatusDto {
  @ApiProperty({
    description: 'Whether the user is in queue',
    example: true,
  })
  inQueue: boolean;

  @ApiProperty({
    description: 'Status of the queue entry',
    example: 'waiting',
    enum: ['waiting', 'matched', 'expired', 'none'],
  })
  status: string;

  @ApiProperty({
    description: 'Position in queue',
    example: 3,
  })
  position: number;

  @ApiProperty({
    description: 'Estimated wait time in seconds',
    example: 45,
  })
  estimatedWaitTimeSeconds: number;

  @ApiProperty({
    description: 'Total number of players in queue',
    example: 12,
  })
  totalInQueue: number;

  @ApiProperty({
    description: 'Game ID if match was found',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
    nullable: true,
  })
  gameId?: string | null;

  @ApiProperty({
    description: 'Game type',
    example: 'chess',
    enum: GameType,
    required: false,
    nullable: true,
  })
  gameType: GameType | null;

  @ApiProperty({
    description: 'Queue entry ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
    nullable: true,
  })
  queueId: string | null;

  @ApiProperty({
    description: 'When the user joined the queue',
    example: '2023-07-15T12:34:56.789Z',
    required: false,
    nullable: true,
  })
  joinedAt: string | null;
}

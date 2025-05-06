import { GameType } from '../dto/join-queue.dto';

export interface QueueEntry {
  id: string;
  userId: string;
  gameType: GameType;
  eloRating: number;
  joinedAt: Date | string;
  status: 'waiting' | 'matched' | 'expired';
  gameId?: string;
}

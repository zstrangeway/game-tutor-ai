import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(RedisService.name);
  
  constructor(private configService: ConfigService) {
    const host = this.configService.get('REDIS_HOST', 'localhost');
    const port = parseInt(this.configService.get('REDIS_PORT', '6379'));
    
    this.logger.log(`Connecting to Redis at ${host}:${port}`);
    
    this.redis = new Redis({
      host,
      port,
      lazyConnect: true,
    });
    
    this.redis.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`, err.stack);
    });
    
    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
    
    this.connectToRedis();
  }
  
  private async connectToRedis(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (err) {
      this.logger.error(`Failed to connect to Redis: ${err.message}`);
    }
  }
  
  // Queue operations
  async addToQueue(queueKey: string, entry: Record<string, any>): Promise<void> {
    await this.redis.lpush(queueKey, JSON.stringify(entry));
  }

  async getQueueEntry(queueKey: string, id: string): Promise<any | null> {
    const entries = await this.getAllQueueEntries(queueKey);
    const found = entries.find(entryStr => {
      try {
        const entry = JSON.parse(entryStr);
        return entry.id === id;
      } catch (e) {
        return false;
      }
    });
    
    return found ? JSON.parse(found) : null;
  }

  async removeFromQueue(queueKey: string, id: string): Promise<boolean> {
    const entries = await this.getAllQueueEntries(queueKey);
    const entryToRemove = entries.find(entryStr => {
      try {
        const entry = JSON.parse(entryStr);
        return entry.id === id;
      } catch (e) {
        return false;
      }
    });
    
    if (entryToRemove) {
      await this.redis.lrem(queueKey, 1, entryToRemove);
      return true;
    }
    return false;
  }

  async getAllQueueEntries(queueKey: string): Promise<string[]> {
    return this.redis.lrange(queueKey, 0, -1);
  }

  // Active games operations
  async setActiveGame(gameId: string, gameData: Record<string, any>): Promise<void> {
    await this.redis.hset('activeGames', gameId, JSON.stringify(gameData));
  }

  async getActiveGame(gameId: string): Promise<any | null> {
    const game = await this.redis.hget('activeGames', gameId);
    return game ? JSON.parse(game) : null;
  }

  async removeActiveGame(gameId: string): Promise<void> {
    await this.redis.hdel('activeGames', gameId);
  }

  async getAllActiveGames(): Promise<Record<string, any>> {
    const games = await this.redis.hgetall('activeGames');
    
    // Parse all JSON values
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(games)) {
      try {
        result[key] = JSON.parse(value as string);
      } catch (e) {
        this.logger.warn(`Failed to parse game data for ${key}`);
      }
    }
    
    return result;
  }

  async getActiveGameIds(): Promise<string[]> {
    return Object.keys(await this.redis.hgetall('activeGames'));
  }

  async countActiveGames(): Promise<number> {
    return this.redis.hlen('activeGames');
  }

  // Game state operations
  async getGame(gameId: string): Promise<any | null> {
    return this.getActiveGame(gameId);
  }

  // Rematch requests
  async setRematchRequest(key: string, data: Record<string, any>): Promise<void> {
    await this.redis.hset('rematchRequests', key, JSON.stringify(data));
    // Set expiration for auto-cleanup (2 minutes)
    await this.redis.expire(`rematchRequest:${key}`, 120);
  }
  
  async getRematchRequest(key: string): Promise<any | null> {
    const request = await this.redis.hget('rematchRequests', key);
    return request ? JSON.parse(request) : null;
  }
  
  async removeRematchRequest(key: string): Promise<void> {
    await this.redis.hdel('rematchRequests', key);
  }
  
  async getAllRematchRequests(): Promise<[string, any][]> {
    const requests = await this.redis.hgetall('rematchRequests');
    
    // Parse all JSON values and convert to array of [key, value] pairs
    const result: [string, any][] = [];
    for (const [key, value] of Object.entries(requests)) {
      try {
        result.push([key, JSON.parse(value as string)]);
      } catch (e) {
        this.logger.warn(`Failed to parse rematch request data for ${key}`);
      }
    }
    
    return result;
  }
  
  // General methods
  async set(key: string, value: any, expirySeconds?: number): Promise<void> {
    if (expirySeconds) {
      await this.redis.setex(key, expirySeconds, JSON.stringify(value));
    } else {
      await this.redis.set(key, JSON.stringify(value));
    }
  }

  async get(key: string): Promise<any | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value as string) : null;
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
  
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error(`Redis ping failed: ${error.message}`);
      return false;
    }
  }

  onModuleDestroy() {
    this.logger.log('Closing Redis connection');
    this.redis.disconnect();
  }
} 
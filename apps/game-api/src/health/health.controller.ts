import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RedisService } from '../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly redisService: RedisService) {}

  @ApiOperation({ summary: 'Check API health' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  @Get()
  checkHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @ApiOperation({ summary: 'Check Redis connection' })
  @ApiResponse({ status: 200, description: 'Redis connection status' })
  @Get('redis')
  async checkRedisHealth() {
    try {
      const testKey = 'health-check';
      await this.redisService.set(testKey, { status: 'ok', timestamp: Date.now() });
      const result = await this.redisService.get(testKey);
      await this.redisService.del(testKey);
      
      return { 
        status: 'ok', 
        connected: true, 
        data: result, 
        timestamp: new Date().toISOString() 
      };
    } catch (error) {
      return { 
        status: 'error', 
        connected: false, 
        message: error.message, 
        timestamp: new Date().toISOString() 
      };
    }
  }
} 
import { Module } from '@nestjs/common';
import { MultiplayerController } from './multiplayer.controller';
import { MultiplayerService } from './multiplayer.service';

@Module({
  controllers: [MultiplayerController],
  providers: [MultiplayerService],
  exports: [MultiplayerService],
})
export class MultiplayerModule {}

import { Module } from '@nestjs/common';
import { ChatBotService } from './chat-bot.service';
import { ChatBotController } from './chat-bot.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  providers: [ChatBotService,],
  imports: [PrismaModule, HttpModule],
  controllers: [ChatBotController]
})
export class ChatBotModule {}

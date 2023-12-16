import { Module } from '@nestjs/common';
import { ChatBotController } from './chat-bot.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { LlmBasicPromptService } from '../services/llmBasicPrompt.service';
import { RagService } from '../services/rag.service';

@Module({
  providers: [LlmBasicPromptService, RagService],
  imports: [PrismaModule, HttpModule],
  controllers: [ChatBotController]
})
export class ChatBotModule {}

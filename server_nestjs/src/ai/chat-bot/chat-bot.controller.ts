import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ChatBotService } from './chat-bot.service';
import { ChatBotMessageDTO } from '@DTOs/chatBot.dto';

@Controller('chat-bot')
export class ChatBotController {
  constructor(private readonly ChatBotService: ChatBotService) {}

  @Post('ask')
  @HttpCode(200)
  askQuestion(@Body('question') question: string): Promise<ChatBotMessageDTO> {
    return this.ChatBotService.askQuestion(question);
  }
}

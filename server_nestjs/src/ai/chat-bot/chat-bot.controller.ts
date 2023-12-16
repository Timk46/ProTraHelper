import { Controller, Post, Body, HttpCode, Res } from '@nestjs/common';
import { LlmBasicPromptService } from '../services/llmBasicPrompt.service';
import { Response } from 'express';

@Controller('chat-bot')
export class ChatBotController {
  constructor(

    private readonly llmBasicPromptService: LlmBasicPromptService,
    ) {}

  @Post('ask/basic')
  async askBasic(@Body('question') question: string): Promise<any> {
    const answer = await this.llmBasicPromptService.generateLlmAnswer("Du bist ein hilfreicher Assistent.", question);
    return { answer: answer };
  }

  @Post('ask/basic/getStream')
  async askBasicWithStreamAnswer(
    @Body('question') question: string,
    @Res() res: Response
  ): Promise<void> {
    res.set('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const systemMessage: string = "Du bist ein hilfreicher Assistent." //Systemmessage can be modified depending on the task
    const result = await this.llmBasicPromptService.streamLlmAnswer(systemMessage, question, res)
  }
}

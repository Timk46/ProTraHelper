import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { LlmBasicPromptService } from '../services/llmBasicPrompt.service';
import { Response } from 'express';
import { ChatBotRAGService } from './chatbot_rag.service';

@Controller('chat-bot')
export class ChatBotController {
  constructor(
    private readonly llmBasicPromptService: LlmBasicPromptService,
    private readonly chatBotRAGService: ChatBotRAGService
  ) {}

  @Post('ask/basic')
  async askBasic(@Body('question') question: string): Promise<any> {
    const answer = await this.llmBasicPromptService.generateLlmAnswer("Du bist ein hilfreicher Assistent.", question);
    return { answer: answer };
  }


  //For Dialogs with multiple messages
  @Post('ask/basic/getStreamDialog')
  async askBasicWithStreamAnswerDialog(
    @Body('context') context: Array<{ role: string, content: string }>,
    @Body('question') question: string,
    @Body('dialogSessionId') dialogSessionId: string,
    @Res() res: Response,
    @Req() req
  ): Promise<void> {
    res.set('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    if (context.length > 3) { // 3 is the minimum an default number including the default question by the llm
        const result = await this.chatBotRAGService.chatBotRagAnswerDialog(context, question, res, req.user.id, dialogSessionId);
      }
    else {
        const result = await this.chatBotRAGService.chatBotRagAnswer(question, res, req.user.id, dialogSessionId);
    }

  }
}

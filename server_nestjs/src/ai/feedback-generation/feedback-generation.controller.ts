import { ChatBotMessageDTO } from '@Interfaces/index';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { FeedbackGenerationService } from './feedback-generation.service';

@Controller('feedback-generation')
export class FeedbackGenerationController {

    constructor(private readonly feedbackService: FeedbackGenerationService ) {}

    /* @Post('ask-freetext')
    @HttpCode(200)
    askQuestion(@Body('question') data: {question: string, }): Promise<ChatBotMessageDTO> {
        return this.feedbackService.askQuestion(question);
    } */


}

import { Controller } from '@nestjs/common';
import { Body, Post } from '@nestjs/common';
import { Lecturer } from '@/auth/custom.decorators';
import { GptService } from './gpt.service';
import { editorDataDTO } from '@DTOs/index';

@Controller('gpt')
export class GptController {

    constructor(private gptService: GptService) {}

    /**
     * Retrieves GPT feedback.
     * @param body - The request body containing the solution and attempt data.
     * @returns A Promise that resolves to the result of the feedback request.
     */
    @Lecturer()
    @Post('getGptFeedback')
    async getGptFeedback(@Body() body: {solution: editorDataDTO, attempt: editorDataDTO}) {
        return await this.gptService.sendFeedbackRequest(body.solution, body.attempt);
    }

}

import { Body, Controller, Post, Req } from '@nestjs/common';
import { CodingQuestionGeneratorService } from './codingQuestionGenerator.service';
import { Public } from '../../public.decorator';
import { genTaskDto } from '@DTOs/tutorKaiDtos/genTask.dto';

@Controller('coding-question-generator')
export class CodingQuestionGeneratorController {
    constructor(private readonly codingQuestionGeneratorService: CodingQuestionGeneratorService) {}

    @Post('contextualizedTask')
    async genTask(@Req() req, @Body() body: {inhalt: string, kontext: string}) {
        console.log("genTask in Controller ausgeführt ...");

        const {inhalt, kontext} = body;
        const genTask: genTaskDto = await this.codingQuestionGeneratorService.genTask(inhalt, kontext);
        //const questionId = await this.codingQuestionGeneratorService.saveTaskToDB(req.user.id, genTask, inhalt, kontext);

        //console.log(`Datenbankeintrag für Connection-Tabelle ... genTask.id: ${genTask.id}, questionId: ${questionId}`);
        //const connectionId = await this.codingQuestionGeneratorService.createGenTaskQuestionEntry(req.user.id, genTask.id, questionId);

        return genTask;
    }
}

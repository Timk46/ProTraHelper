import { Body, Controller, Post, Req } from '@nestjs/common';
import { CodingQuestionGeneratorService } from './codingQuestionGenerator.service';
import { Public } from '../../public.decorator';
import { genTaskDto } from '@DTOs/tutorKaiDtos/genTask.dto';
import { CodingQuestionGeneratorCppService } from './codingQuestionGeneratorCPP.service';
import { CodeGeruestDto, CodingQuestionInternal } from '@Interfaces/question.dto';

@Controller('coding-question-generator')
export class CodingQuestionGeneratorController {
    constructor(
      private readonly codingQuestionGeneratorService: CodingQuestionGeneratorService,
      private readonly codingQuestionGeneratorCppService: CodingQuestionGeneratorCppService
    ) {}

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

    @Post('genCppTask')
    async genCppTask(@Req() req, @Body() body: {taskDescription: string, codeGerueste: CodeGeruestDto[]}) {
        console.log("genTask in Controller ausgeführt ...");
        const {taskDescription, codeGerueste} = body;
        const genTask: CodingQuestionInternal = await this.codingQuestionGeneratorCppService.genCPPTask(taskDescription, codeGerueste);

        return genTask;
    }
}


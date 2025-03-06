import { Body, Controller, Post, Req } from '@nestjs/common';
import { CodingQuestionGeneratorService } from './codingQuestionGeneratorPython.service';
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

    @Post('genPythonTaskWithTopic')
    async genPythonTask(@Req() req, @Body() body: {concept: string, context: string}) {
        console.log("genPythonTaskWithTopic in Controller ausgeführt ...");
        const {concept, context} = body;
        const genTask: CodingQuestionInternal = await this.codingQuestionGeneratorService.genPythonTaskWithTopic(concept, context);

        return genTask;
    }

    @Post('genCppTask')
    async genCppTask(@Req() req, @Body() body: {taskDescription: string, codeGerueste: CodeGeruestDto[]}) {
        console.log("genCppTask in Controller ausgeführt ...");
        const {taskDescription, codeGerueste} = body;
        const genTask: CodingQuestionInternal = await this.codingQuestionGeneratorCppService.genCPPTask(taskDescription, codeGerueste);

        return genTask;
    }
}


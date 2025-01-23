import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import { CodeGameService } from './code-game.service';
import { detailedQuestionDTO } from '@DTOs/detailedQuestion.dto';
import { CodeGameEvaluationService } from '@/code-game/code-game-evaluation/code-game-evaluation.service';

@Controller('code-game')
export class CodeGameController {
  constructor(
    private readonly codeGameService: CodeGameService,
    private readonly codeGameEvaluationService: CodeGameEvaluationService,
  ) {}

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<detailedQuestionDTO> {
    return await this.codeGameService.findOne(id);
  }

  @Post('execute')
  async execute(
    @Req() req,
    @Body('questionId') questionId: string,
    @Body('mainFile') mainFile: { [fileName: string]: string },
    @Body('additionalFiles') additionalFiles: { [fileName: string]: string },
    @Body('gameFile') gameFile: { [fileName: string]: string },
  ) {
    const executionResult = await this.codeGameService.executeCodeGameTask(
      mainFile,
      additionalFiles,
      gameFile,
    );

    const submittedCode: { [fileName: string]: string } = {
      ...mainFile,
      ...additionalFiles,
    };

    const evaluationResult =
      await this.codeGameEvaluationService.evaluateSubmission(
        parseInt(questionId),
        submittedCode,
        executionResult,
      );

    return evaluationResult;
  }
}

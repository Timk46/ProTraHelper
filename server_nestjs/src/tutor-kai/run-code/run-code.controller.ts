import { Controller, Post, Body, Req } from '@nestjs/common';
import { RunCodeService } from './run-code.service';
import { CodeSubmissionResultDto } from '@DTOs/index';
import { detailedQuestionDTO } from '@DTOs/index';

@Controller('run-code')
export class RunCodeController {
  constructor(private readonly runCodeService: RunCodeService) {}

  @Post('execute')
  async execute(
    @Req() req,
    @Body('taskId') taskId: string,
    @Body('inputArgs') inputArgs: string[],
    @Body('CodeFiles') files: { [fileName: string]: string },
  ): Promise<CodeSubmissionResultDto> {
    const results = await this.runCodeService.executeCodeForSubmission(
      files,
      parseInt(taskId),
      req.user.id,
    );
    return results;
  }

  @Post('executeForTaskCreation')
  async executeForTaskCreation(
    @Req() req,
    @Body('detailedQuestion') detailedQuestion: detailedQuestionDTO,
  ): Promise<CodeSubmissionResultDto> {
    const results = await this.runCodeService.executeCodeForTaskCreation(
      detailedQuestion,
      req.user.id,
    );
    return results;
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CodeGameService } from './code-game.service';
import { detailedQuestionDTO } from '@DTOs/detailedQuestion.dto';

@Controller('code-game')
export class CodeGameController {
  constructor(private readonly codeGameService: CodeGameService) {}

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<detailedQuestionDTO> {
    return await this.codeGameService.findOne(id);
  }

  @Post('execute')
  async execute(
    @Body('mainFile') mainFile: { [fileName: string]: string },
    @Body('additionalFiles') additionalFiles: { [fileName: string]: string },
    @Body('gameFile') gameFile: { [fileName: string]: string },
  ) {
    return await this.codeGameService.executeCodeGameTask(
      mainFile,
      additionalFiles,
      gameFile,
    );
  }
}

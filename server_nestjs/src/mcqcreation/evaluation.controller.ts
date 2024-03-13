/* eslint-disable prettier/prettier */
import { Controller, Get, Query } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import * as path from 'path';


@Controller('evaluation')
export class EvaluationController {
  private folderPath: string;
  constructor(private evaluationService: EvaluationService) {
    this.folderPath = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'MCQs', 'ToEvaluate');
    console.log("the folder path: ", this.folderPath);
  }
  @Get('directory')
  async evaluateAll(): Promise<void>{
    console.log("the file path in controller: ", this.folderPath);
    const result = await this.evaluationService.evaluateFromDirectory(this.folderPath);
    console.log("the result: ", result);
  }

  @Get('single')
  async evaluateSingle(@Query('concept') conceptname: string): Promise<void>{
   const result = await this.evaluationService.evaluateFromJsonFile(this.folderPath+'/'+conceptname+'MCQs.json');
    console.log("the result: ", result);
  }
}

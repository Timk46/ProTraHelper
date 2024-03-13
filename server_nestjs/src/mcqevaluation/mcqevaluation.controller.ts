/* eslint-disable prettier/prettier */

import { Controller, Get, Query } from '@nestjs/common';
import * as path from 'path';
import { McqevaluationService } from './mcqevaluation.service';

@Controller('mcqevaluation')
export class McqevaluationController {
  private folderPath: string;
  constructor(private mcqevaluationService: McqevaluationService) {
    this.folderPath = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'MCQs', 'Collections', 'CollectionOutput', '_ToEvaluate');
    console.log("the folder path: ", this.folderPath);
  }

  @Get('directory')
  async evaluateAll(): Promise<void>{
    // fix concept name parameter
    await this.mcqevaluationService.evaluateFromDirectory("");
  }

  @Get('single')
  async evaluateSingle(@Query('concept') conceptname: string): Promise<void>{
   await this.mcqevaluationService.evaluateFromJsonFile(this.folderPath+'/'+conceptname+'MCQs.json');
  }

  //TODO put functionality of latest functions within runCollection and evaluate + build workbook iteratively?
  // OR put conceptnames into every function in order to control what to evaluate and build workbook for
  @Get('runandcombine')
  async runAndCombine(@Query('collection') collections: string, @Query('iterations') iterations: number ): Promise<void>{
    console.log("collections: ", collections);
    //  for(const collection of collections.split(',')){
    //   console.log(`Running collection: ${collection}`);
    //     try {
    //       await this.mcqevaluationService.runCollection(collection.trim(), iterations);
    //     } catch (err) {
    //       console.error(`Error running collection ${collection}:`, err);
    //     }
    // }

    // console.log("runCollections done");
    // for (const collection of collections.split(',')){
    //   await this.mcqevaluationService.combineResponses(collection.trim());
    // }
    // console.log("combineResponses done");
    // for(const collection of collections.split(',')){
    //   await this.mcqevaluationService.removeCorrectFieldFromOptions(collection.trim());
    // }
    // console.log("removeCorrectFieldFromOptions done");
    // for(const collection of collections.split(',')){
    //   await this.mcqevaluationService.evaluateFromDirectory(collection.trim());
    // }
    // console.log("evaluateFromDirectory done");

    for(const collection of collections.split(',')){
      await this.mcqevaluationService.createAndTransformWorkbook(collection.trim());
    }

    //await this.mcqevaluationService.createAndTransformWorkbook(collection);
    console.log("createAndTransformWorkbook done");
    console.time('runandcombine');

  }

}

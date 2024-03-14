/* eslint-disable prettier/prettier */

import { Controller, Get, Query } from '@nestjs/common';
import * as path from 'path';
import { McqevaluationService } from './mcqevaluation.service';
import { ContentService } from '../../../server_nestjs/src/content/content.service';


@Controller('mcqevaluation')
export class McqevaluationController {
  private folderPath: string;
  constructor(private mcqevaluationService: McqevaluationService, private contentService: ContentService) {
    this.folderPath = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'MCQs', 'Collections', 'CollectionOutput', '_ToEvaluate');
    console.log("the folder path: ", this.folderPath);
  }

  /** Evaluates all MCQs in the folder
   *
   */
  @Get('directory')
  async evaluateAll(): Promise<void>{
    // fix concept name parameter
    const conceptCollectionNames = await this.contentService.fetchAllConceptNames();
    const names: string = conceptCollectionNames.join(',');
    console.log("Concept names: ", names);
    await this.mcqevaluationService.evaluateFromDirectory(names);
  }

  /** Evaluates a single MCQ file
   *
   * @param conceptname
   */
  @Get('single')
  async evaluateSingle(@Query('concept') conceptname: string): Promise<void>{
   await this.mcqevaluationService.evaluateFromJsonFile(conceptname);
  }

  //TODO put functionality of latest functions within runCollection and evaluate + build workbook iteratively?
  // OR put conceptnames into every function in order to control what to evaluate and build workbook for
  /** runs (multiple) collections, combines responses, evaluates and builds workbooks from evaluations (functionality later probably exchanged with database functionality?)
   *
   * @param collections
   * @param iterations
   */
  @Get('runandcombine')
  async runAndCombine(@Query('collection') collections: string, @Query('iterations') iterations: number ): Promise<void>{
  const collectionArray = collections.split(',').map(collection => collection.trim());
  console.log("Collections: ", collectionArray);

  console.time('runandcombine');
  for (const collection of collectionArray) {
    console.log(`Running operations for collection: ${collection}`);

    try {
      await this.mcqevaluationService.runCollection(collection, iterations);
      await this.mcqevaluationService.combineResponses(collection);
      await this.mcqevaluationService.removeCorrectFieldFromOptions(collection);
      await this.mcqevaluationService.evaluateFromDirectory(collection);
      await this.mcqevaluationService.createAndTransformWorkbook(collection);
    } catch (err) {
      console.error(`Error during operations for collection ${collection}:`, err);
    }
  }

  console.log("All operations completed.");
  console.timeEnd('runandcombine');

  }

}

/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { McqCreationService } from './mcqcreation.service';
import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';
import { appendFile } from 'fs';

interface McqEvaluation {
  correct?: boolean;
  reasoning?: string;
}

interface McqEvaluations {
  evaluations?: McqEvaluation[];
}

@Injectable()
export class EvaluationService {
  constructor(private mcqCreationService: McqCreationService) {}

  async evaluateFromJsonFile(filePath: string): Promise<void> {
    const readFile = util.promisify(fs.readFile);
    const writeFile = util.promisify(fs.writeFile);

    const data = await readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(data);
    const evaluations: McqEvaluations[] = [];

    for (const questionData of jsonData.questions) {
      const question = questionData.question;
      const options: string[] = questionData.options.map(option => option.answer);
      const evaluation = await this.mcqCreationService.getEvaluation(question, options);
      evaluations.push(evaluation);
    }

    const evalPath = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'MCQs', 'Evaluations',`${path.basename(filePath, '.json')}_evaluation.json` )
    await writeFile(evalPath, JSON.stringify(evaluations, null, 2));
  }

  async evaluateFromDirectory(directoryPath: string): Promise<void> {
    const readdir = util.promisify(fs.readdir);
    const readFile = util.promisify(fs.readFile);
    const writeFile = util.promisify(fs.writeFile);

    const fileNames = await readdir(directoryPath);
    const jsonFiles = fileNames.filter(fileName => path.extname(fileName) === '.json');

    const evaluationsPromises = jsonFiles.map(async jsonFile => {
      const filePath = path.join(directoryPath, jsonFile);
      const data = await readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(data);
      const evaluations: McqEvaluations[] = [];

      for (const questionData of jsonData.questions) {
        const question = questionData.question;
        console.log("the type of the question: ", typeof question);
        const options: string[] = questionData.options.map(option => option.answer);
        const opts: string[] = questionData.options.map((option: { answer: any; }) => option.answer);
        console.log("the opts: ", opts)
        console.log("type of the options: ", typeof opts);
        console.log("the options: ",  options);
        console.log("type of the options: ", typeof options);
        if(question && options){
          const evaluation = await this.mcqCreationService.getEvaluation(question, options);
          evaluations.push(evaluation);
          const evalPath = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'MCQs', 'Evaluations',`${path.basename(jsonFile, '.json')}_evaluation.json` )
           await writeFile(evalPath, JSON.stringify(evaluations, null, 2));
        } else {
          console.log("the question or options are not available");
        }
      }
    });

    await Promise.all(evaluationsPromises);
  }
}

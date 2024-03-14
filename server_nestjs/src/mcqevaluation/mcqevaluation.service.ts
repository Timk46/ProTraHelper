/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as f from 'fs';
import * as newman from 'newman';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { McqCreationService } from '@/mcqcreation/mcqcreation.service';
import { promisify } from 'util';

interface McqEvaluation {
  correct?: boolean;
  reasoning?: string;
}

interface McqEvaluations {
  evaluations?: McqEvaluation[];
}

interface FlatData {
  concept: string;
  question: string;
  answer: string;
  correct: boolean;
  match: number;
  reasoning: string;
  description: string;
  score: number;
}

interface AggregatedData {
  [key: string]: {
    answers: string[];
    corrects: boolean[];
    matches: number[];
    reasonings: string[];
    descriptions?: string[];
    scores?: number[];
  };
}

@Injectable()
export class McqevaluationService {
  private collectionOutputPath: string = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'MCQs', 'Collections', 'CollectionOutput');
  private collectionsPath: string = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'MCQs', 'Collections');
  private count: number = 0;
  private evaluationsPath: string = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'MCQs', 'Evaluations');
  private questionsByConcept: { [key: string]: any[] } = {};

  constructor(private mcqCreationService: McqCreationService) {}

  /** evaluates a single MCQ from a single JSON file
   *
   * @param filePath
   */
  async evaluateFromJsonFile(conceptname: string): Promise<void> {
    const filepath = path.join(this.collectionOutputPath, '_ToEvaluate');
    const data = await fs.readFile(filepath+'/'+conceptname+'MCQs.json', 'utf-8');
    const jsonData = JSON.parse(data);
    const evaluations: McqEvaluations[] = [];

    for (const questionData of jsonData.questions) {
      const question = questionData.question;
      const options: string[] = questionData.options.map((option: { answer: string; }) => option.answer);
      const evaluation = await this.mcqCreationService.getEvaluation(question, options);
      evaluations.push(evaluation);
    }

    const outputPath = path.join(filepath,`${path.basename(filepath, '.json')}_evaluation.json` )
    await fs.writeFile(outputPath, JSON.stringify(evaluations, null, 2));
  }

  /** evaluates a collection of MCQs from a directory
   *
   * @param conceptName
   */
  async evaluateFromDirectory(conceptName:string): Promise<void> {

    const fileNames = await fs.readdir(path.join(this.collectionOutputPath, '_ToEvaluate'));
    const jsonFiles = fileNames.filter(fileName => fileName.startsWith(`${conceptName}MCQs`));

    const evaluationsPromises = jsonFiles.map(async jsonFile => {
      const filePath = path.join(path.join(this.collectionOutputPath, '_ToEvaluate'), jsonFile);
      const data = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(data);
      const evaluations: McqEvaluations[] = [];

      for (const questionData of jsonData.questions) {
        const question = questionData.question;
        console.log("the type of the question: ", typeof question);
        const options: string[] = questionData.options.map((option: { answer: any; }) => option.answer);
        const opts: string[] = questionData.options.map((option: { answer: any; }) => option.answer);
        console.log("the opts: ", opts)
        console.log("type of the options: ", typeof opts);
        console.log("the options: ",  options);
        console.log("type of the options: ", typeof options);
        if(question && options){
          const evaluation = await this.mcqCreationService.getEvaluation(question, options);
          evaluations.push(evaluation);
          const evalPath = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'MCQs', 'Evaluations',`${path.basename(jsonFile, '.json')}_evaluation.json` )
           await fs.writeFile(evalPath, JSON.stringify(evaluations, null, 2));
        } else {
          console.log("the question or options are not available");
        }
      }
    });

    await Promise.all(evaluationsPromises);
  }

  /** runs a collection of requests in postman and saves the responses to a folder
   *
   * @param conceptName
   * @param iterations
   */
  async runCollection(conceptName: string, iterations: number): Promise<void> {
    console.log("the collection name: ", conceptName);
    const collections = await fs.readdir(this.collectionsPath);
    console.log("the collections: ", collections);
    const collectionFiles = collections.filter(fileName => path.extname(fileName) === '.json');
    console.log("the colelction files: ", collectionFiles);
    console.log("iterations: ", iterations);

    const existingFiles = await fs.readdir(this.collectionOutputPath);
    // Filter the list to only include files that match the response file pattern
    const responseFiles = existingFiles.filter(fileName => fileName.startsWith(`response-${conceptName}`) && fileName.endsWith('.json'));
    // Set the count to the number of existing response files
    this.count = responseFiles.length;
    await new Promise((resolve, reject) => {
      newman.run({
        collection: require(path.join(this.collectionsPath, `${conceptName}Collection.json`)),
        reporters: ['cli', 'json'],
        iterationCount: 9,
        reporter: {
          json: {
            export: `${path.join(this.collectionOutputPath, 'NewmanReports')}/report_.json`,
          },
        },
      })
      .on('request', (err, data) => {
        if (err) {
          console.log(err);
          return;
        }

        const reqName: string = data.item.name.replace(/[^a-z0-9]/gi, '_');
        const fileName: string = `response-${reqName}_${this.count}.json`;
        const content: string = data.response.stream.toString();

        f.writeFile(path.join(this.collectionOutputPath, fileName), content, (err: NodeJS.ErrnoException | null) => {
          if (err) console.log("err");
        });

        this.count++;
      })
      .on('done', (err, summary) => {
        if (err || summary.error) {
          console.error('Collection run encountered an error.', err);
          reject(err);
        } else {
          console.log(`Iteration ${this.count} completed successfully.`);
          resolve(summary);
        }
      });
    })
  }


  /** combines the single responses from the postman collection run into a single JSON file
   *
   */
  async combineResponses(conceptName:string): Promise<void> {
    f.readdirSync(this.collectionOutputPath).forEach(filename => {
      if (filename.startsWith(`${conceptName}MCQs`)) {
        console.log("the filename: ", filename);
        const concept = filename.split('-')[1].split('_')[0];
        const data = JSON.parse(f.readFileSync(path.join(this.collectionOutputPath, filename), 'utf-8'));
        const question = data['question'];
        const options = data['answers'];
        console.log("the concept: ", concept, "the question: ", question, "the options: ", options);

        if (!this.questionsByConcept[concept]) {
          this.questionsByConcept[concept] = [];
        }
        this.questionsByConcept[concept].push({ 'question': question, 'options': options });
      }
    });

    if (!f.existsSync(this.collectionOutputPath + '/' + '_combined')) {
      f.mkdirSync(this.collectionOutputPath + '/' + '_combined', { recursive: true });
    }

    for (const concept in this.questionsByConcept) {
        const filePath = path.join(this.collectionOutputPath + '/' + '_combined', `${concept}MCQs.json`);
        let existingData = [];

        // check if file exists and read data
        if (f.existsSync(filePath)) {
            existingData = JSON.parse(f.readFileSync(filePath, 'utf-8')).questions;
        }

        // add data to existing data
        const combinedData = existingData.concat(this.questionsByConcept[concept]);

        // write data to file
        f.writeFileSync(filePath, JSON.stringify({ 'questions': combinedData }, null, 2));
    }
  }

  /** removes the correct field from the options in the combined JSON files (preparation for automatic evaluation)
   * @param conceptName
   */
  async removeCorrectFieldFromOptions(conceptName:string): Promise<void> {

    const folderPath = path.join(this.collectionOutputPath, `_combined`);
    const outputFolder = path.join(this.collectionOutputPath, `_ToEvaluate`);

    // checking if output folder exists
    if (!f.existsSync(outputFolder)) {
      f.mkdirSync(outputFolder, { recursive: true });
    }

    // iterate through all files in the folder
    const files = f.readdirSync(folderPath);
    console.log("the files in _combined Folder: ", files);
    for (const filename of files) {
      if (filename.startsWith(`${conceptName}MCQs`)) {

        // get json data for parsing
        const dataPath = path.join(folderPath, filename);
        const data = JSON.parse(f.readFileSync(dataPath, 'utf-8'));
        console.log("datapath: ", dataPath);

        // iterating over questions to remove correct field from options
        for (const question of data['questions']) {
          console.log("the question where question[options] is not iterablw: ", question);
          for (const option of question['options']) {
            if ('correct' in option) {
              delete option['correct'];
            }
          }
        }

        // save json data to file in output folder
        const outputPath = path.join(outputFolder, filename);
        console.log("the output path: ", outputPath);
        f.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      }
    }
  }

  // TODO: REEASONING MIT INS WORKBOOK?
  /** creates the complete excel workbook from the combined responses (with evaluations in it)
   *
   * @param conceptname
   */
  async createAndTransformWorkbook(conceptname: string): Promise<void> {
    const allData: FlatData[] = [];

    // read data
    const files = await fs.readdir(path.join(this.collectionOutputPath, `_combined`));
    for (const filename of files) {
      console.log("the filename: ", filename);
      if (filename.startsWith(`${conceptname}MCQs`)) {
        const dataPath = path.join(path.join(this.collectionOutputPath, `_combined`), filename);
        const data = JSON.parse(await fs.readFile(dataPath, 'utf-8'));
        console.log("the data: ", data);
        const evaluationFilename = filename.replace('.json', '_evaluation.json');
        const evaluationDataPath = path.join(this.evaluationsPath, evaluationFilename);
        const evaluationData = JSON.parse(await fs.readFile(evaluationDataPath, 'utf-8'));
        console.log("the evaluation data: ", evaluationData);
        const concept = filename.split('MCQ')[0];

        data['questions'].forEach((question: any, i: number) => {
          // maybe change to question['answers'] due to autogenerated format
          question['options'].forEach((answer: any, j: number) => {
            const match = answer['correct'] === evaluationData[i]['evaluations'][j]['correct'] ? 1 : 0;

            allData.push({
              concept,
              question: question['question'],
              answer: answer['answer'],
              correct: answer['correct'],
              match,
              reasoning: evaluationData[i]['evaluations'][j]['reasoning'],
              description: question['description'] || '',
              score: question['score'] || 0,
            });
          });
        });
      }
    }

    // aggregate and transform the data for the workbook
    const aggregatedData: AggregatedData = {};
    allData.forEach(item => {
      const key = `${item.concept}-${item.question}`;
      if (!aggregatedData[key]) {
        aggregatedData[key] = { answers: [], corrects: [], matches: [], reasonings: [], descriptions: [], scores: []};
      }
      aggregatedData[key].answers.push(item.answer);
      aggregatedData[key].corrects.push(item.correct);
      aggregatedData[key].matches.push(item.match);
      aggregatedData[key].reasonings.push(item.reasoning);
      //aggregatedData[key].descriptions.push(item.description);
      //aggregatedData[key].scores.push(item.score);
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Evaluation');

    worksheet.columns = [
      { header: 'Konzept', key: 'concept', width: 5, font: { bold: true } },
      { header: 'Frage', key: 'question', width: 20, font: { bold: true } },
      ...Array.from({ length: 6 }, (_, i) => ({ header: `Antwort ${String.fromCharCode(65 + i)}`, key: `answer${i}` , font: { bold: true }})),
      ...Array.from({ length: 6 }, (_, i) => ({ header: `Korrekt markiert ${String.fromCharCode(65 + i)}`, key: `correctMarked${i}`, width: 5, font: { bold: true } })),
      ...Array.from({ length: 6 }, (_, i) => ({ header: `Übereinstimmung ${String.fromCharCode(65 + i)}`, key: `match${i}`, width: 5, font: { bold: true } })),
      ...Array.from({ length: 6 }, (_, i) => ({ header: `Begründung ${String.fromCharCode(65 + i)}`, key: `reasoning${i}`, width: 5, font: { bold: true } })),
      { header: 'Gesamtübereinstimmung', key: 'totalMatch', width: 5,font: { bold: true } },
    ];
    // Add the data to the worksheet rowwise
    Object.entries(aggregatedData).forEach(([key, value]) => {
    const [concept, ...questionParts] = key.split('-');
    const question = questionParts.join('-');
    const row: any = {
        concept,
        question,
    };
    // Add the answers, corrects, reaosonings and matches to the row for all 6 options
    for (let i = 0; i < 6; i++) {
        row[`answer${i}`] = value.answers[i] || null;
        row[`correctMarked${i}`] = value.corrects[i] ? 1 : 0;
        row[`match${i}`] = value.matches[i] ? 1 : 0;
        row[`reasoning${i}`] = value.reasonings[i] || null;
    }

    // Calculate the total match
    const totalMatch = value.matches.every(match => match === 1) ? 1 : 0;
    row['totalMatch'] = totalMatch;

    worksheet.addRow(row);
  });

    workbook.xlsx.writeFile(path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'MCQs', 'Workbooks', `${conceptname}Evaluation.xlsx`));
    console.log('Die Daten wurden erfolgreich umgeformt und gespeichert.');

  }
}

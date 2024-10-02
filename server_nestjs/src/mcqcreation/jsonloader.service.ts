/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import * as path from 'path';
import { McqGenerationDTO } from '@Interfaces/question.dto';
import { readFileSync } from 'fs';


@Injectable()
export class JsonLoaderService {

  private folderPath: string;
  constructor() {
    this.folderPath = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'MCQs');

  }

  async loadJson(conceptFilename: string): Promise<{ questions: McqGenerationDTO[] }> {
    const filePath = path.join(`${this.folderPath}/${conceptFilename}MCQs.json`);
    try {
      const data = readFileSync(filePath, 'utf8');
      const json: { questions: McqGenerationDTO[] } = JSON.parse(data);
      console.log('json data: ', json);
      return json;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(`Datei nicht gefunden: ${filePath}`);
        return { questions: [] };
      } else {
        throw error;
      }
    }
  }
}

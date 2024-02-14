/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { map } from 'rxjs/operators';
import { HttpService } from '@nestjs/axios';
import * as path from 'path';
import { McqGenerationDTO } from '@Interfaces/question.dto';
import { readFileSync } from 'fs';


@Injectable()
export class JsonLoaderService {

  private folderPath: string;
  constructor() {
    this.folderPath = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'MCQs');

  }

  loadJson(conceptFilename: string): Observable<{ questions: McqGenerationDTO[] }> {
    const filePath = path.join(`${this.folderPath}/${conceptFilename}MCQs.json`);
    const data = readFileSync(filePath, 'utf8');
    const json: { questions: McqGenerationDTO[] } = JSON.parse(data);

    return of(json);
  }
}

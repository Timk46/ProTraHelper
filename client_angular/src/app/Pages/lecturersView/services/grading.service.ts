import { Injectable } from '@angular/core';
import { questionType } from '@DTOs/index';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { UserUploadAnswerListItemDTO } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { ProductionFilesService } from 'src/app/Services/files/production-files.service';
import { FileService } from '../../../Services/files/files.service';

@Injectable()
export class GradingService {
  constructor(
    private questionService: QuestionDataService,
    private productionFiles: ProductionFilesService,
    private fileService: FileService,
  ) {}

  getAllUserUploadAnswers(
    questionId: number,
    questionType?: questionType,
  ): Observable<UserUploadAnswerListItemDTO[]> {
    return this.questionService.getAllUserUploadAnswers(questionId);
  }

  /**
   * Downloads a file and returns both the Blob and the filename from the response header.
   */
  downloadFile(fileUniqueIdentifier: string): Observable<{ blob: Blob; filename: string }> {
    return this.fileService.downloadFile(fileUniqueIdentifier).pipe(
      map(response => {
        // Try to get the filename from the custom header (case-insensitive)
        let filename = response.headers.get('X-Filename') || fileUniqueIdentifier;
        return { blob: response.body as Blob, filename };
      }),
    );
  }
}

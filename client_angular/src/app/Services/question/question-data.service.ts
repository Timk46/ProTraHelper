import {
  McQuestionDTO,
  QuestionDTO,
  MCOptionDTO,
  MCOptionViewDTO,
  McQuestionOptionDTO,
  freeTextQuestionDTO,
  detailedQuestionDTO,
  UserAnswerDataDTO,
  userAnswerFeedbackDTO,
  UserMCOptionSelectedDTO,
  questionType,
  FillinQuestionDTO,
  GraphQuestionDTO,
  uploadQuestionDTO,
  UserUploadAnswerListItemDTO
} from '@DTOs/index';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { McTaskComponent } from 'src/app/Pages/contentView/contentElement/mcTask/mcTask.component';
import { FillinTaskNewComponent } from 'src/app/Pages/contentView/contentElement/fill-in-task-new/fill-in-task-new.component';
import { FreeTextTaskComponent } from 'src/app/Pages/contentView/contentElement/free-text-task/free-text-task.component';
import { EditUploadComponent } from 'src/app/Pages/lecturersView/edit-upload/edit-upload.component';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';

@Injectable({
  providedIn: 'root'
})
export class QuestionDataService {

  constructor(private http: HttpClient, private dialog: MatDialog) { }

  /**
   *
   * @param {number} questionId - The ID of the question to retrieve data for
   * @returns {Observable<QuestionDTO>} An Observable that emits the question data
   */
  getQuestionData(questionId: number) : Observable<QuestionDTO> {
    return this.http.get<QuestionDTO>(environment.server + `/question-data/${questionId}`);
  }

  /**
   * Retrieves detailed question (a question with all its connected specific questions based on the question type) data for a given question ID and type.
   * @param {number} questionId - The ID of the question to retrieve detailed data for.
   * @param {questionType} questionType - The type of the question.
   * @returns {Observable<detailedQuestionDTO>} An Observable that emits a detailedQuestionDTO object.
   */
  getDetailedQuestionData(questionId: number, questionType: questionType) : Observable<detailedQuestionDTO> {
    return this.http.post<detailedQuestionDTO>(environment.server + `/question-data/detailed`, { questionId, questionType });
  }


  /**
   * Retrieves the newest version of a question.
   * @param {number} questionId - The ID of the question to get the newest version for.
   * @returns {Observable<QuestionDTO>} An Observable that emits the newest QuestionDTO.
   */
  getNewestQuestionVersion(questionId: number) : Observable<QuestionDTO> {
    return this.http.get<QuestionDTO>(environment.server + `/question-data/newestQuestionVersion/${questionId}`);
  }

  /**
   * Gets the most recent answer for a question from a specific user.
   * @param {number} questionId - The ID of the question to get the answer for.
   * @param {number} userId - The ID of the user, defaults to -1 for current user.
   * @returns {Observable<UserAnswerDataDTO>} An Observable that emits the UserAnswerDataDTO.
   */
  getNewestUserAnswer(questionId: number, userId: number = -1) : Observable<UserAnswerDataDTO> {
    return this.http.get<UserAnswerDataDTO>(environment.server + `/question-data/newestUserAnswer/${questionId}/${userId}`);
  }

  /**
   * Retrieves the newest user answers for a specific question and type.
   * @param {number} questionId - The ID of the question to get answers for.
   * @param {questionType} [questionType] - The type of the question (optional).
   * @returns {Observable<UserAnswerDataDTO[]>} An Observable that emits an array of UserAnswerDataDTO.
   */
  getAllUserUploadAnswers(questionId: number, questionType?: questionType) : Observable<UserUploadAnswerListItemDTO[]> {
    return this.http.get<UserUploadAnswerListItemDTO[]>(environment.server + `/question-data/allUserUploadAnswers/${questionId}`);
  }

  /**
   * Retrieves multiple choice question data for a specific question version.
   * @param {number} questionVersionId - The version ID of the question.
   * @returns {Observable<McQuestionDTO>} An Observable that emits the McQuestionDTO.
   */
  getMCQuestion(questionVersionId: number) : Observable<McQuestionDTO> {
    return this.http.get<McQuestionDTO>(environment.server + `/question-data/mcQuestion/${questionVersionId}`);
  }

  /**
   * Gets all multiple choice options for a question.
   * @param {number} questionId - The ID of the question to get options for.
   * @returns {Observable<MCOptionViewDTO[]>} An Observable that emits an array of MCOptionViewDTO.
   */
  getMCOptions(questionId: number) : Observable<MCOptionViewDTO[]> {
    return this.http.get<MCOptionViewDTO[]>(environment.server + `/question-data/mcOptions/${questionId}`);
  }

  /**
   * Retrieves free text question data for a specific question version.
   * @param {number} questionVersionId - The version ID of the question.
   * @returns {Observable<freeTextQuestionDTO>} An Observable that emits the freeTextQuestionDTO.
   */
  getFreeTextQuestion(questionVersionId: number) : Observable<freeTextQuestionDTO> {
    return this.http.get<freeTextQuestionDTO>(environment.server + `/question-data/freeTextQuestion/${questionVersionId}`);
  }

  /**
   * Gets fill-in task data for a specific question.
   * @param {number} questionId - The ID of the fill-in question.
   * @returns {Observable<FillinQuestionDTO>} An Observable that emits the FillinQuestionDTO.
   */
  getFillinTask(questionId: number) : Observable<FillinQuestionDTO> {
    return this.http.get<FillinQuestionDTO>(environment.server + `/question-data/fillinQuestion/${questionId}`);
  }

  /**
   * Retrieves graph question data for a specific question version.
   * @param {number} questionVersionId - The version ID of the question.
   * @returns {Observable<GraphQuestionDTO>} An Observable that emits the GraphQuestionDTO.
   */
  getGraphQuestion(questionVersionId: number) : Observable<GraphQuestionDTO> {
    return this.http.get<GraphQuestionDTO>(environment.server + `/question-data/graphQuestion/${questionVersionId}`);
  }

  /**
   * Retrieves upload question data for a specific question version.
   * @param {number} questionVersionId - The version ID of the question.
   * @returns {Observable<uploadQuestionDTO>} An Observable that emits the uploadQuestionDTO.
   */
  getUploadQuestion(questionVersionId: number) : Observable<uploadQuestionDTO> {
    return this.http.get<uploadQuestionDTO>(environment.server + `/question-data/uploadQuestion/${questionVersionId}`);
  }

  /**
   * Creates a new user answer for a question.
   * @param {UserAnswerDataDTO} data - The user answer data containing question response information.
   * @returns {Observable<userAnswerFeedbackDTO>} An Observable that emits the feedback for the submitted answer.
   */
  createUserAnswer(data: UserAnswerDataDTO) : Observable<userAnswerFeedbackDTO> {
    return this.http.post<userAnswerFeedbackDTO>(environment.server + `/question-data/userAnswer/create`, data);
  }


  /**
   * Gets the progress of a question for the currently authenticated user.
   * @param {number} questionId - The ID of the question.
   * @returns {Observable<{ progress: number }>} An Observable with the progress in percent.
   */
  getQuestionProgress(questionId: number): Observable<{ progress: number }> {
    return this.http.get<{ progress: number }>(environment.server + `/question-data/progress/${questionId}`);
  }

  /**
   * Fetches the contentNodeIds and contentElementIds associated with a specific question.
   *
   * @param {number} questionId - The ID of the question.
   * @returns {Observable<{contentNodeId: number, contentElementId: number}>} An Observable that emits a ContentIdsDTO object.
   */
  getContentIds(questionId: number): Observable<{contentNodeId: number, contentElementId: number}> {
    return this.http.get<{contentNodeId: number, contentElementId: number}>(environment.server + `/question-data/contentIds/${questionId}`);
  }

  /**
   * Creates a new user MC option selection record.
   * Links a user's answer to a specific multiple choice option.
   *
   * @param {number} userAnswerId - The ID of the user's answer
   * @param {number} mcOptionId - The ID of the selected multiple choice option
   * @returns {Observable<UserMCOptionSelectedDTO>} An Observable that emits the created UserMCOptionSelectedDTO
   */
  createUserMCOptionSelected(userAnswerId: number, mcOptionId: number) : Observable<UserMCOptionSelectedDTO> {
    return this.http.post<UserMCOptionSelectedDTO>(environment.server + `/question-data/userMCOptionSelected/create`, {userAnswerId, mcOptionId});
  }

  /**
   * Creates a new question in the system.
   *
   * @param {QuestionDTO} question - The question data to create
   * @returns {Observable<QuestionDTO>} An Observable that emits the created QuestionDTO
   */
  createQuestion(question: QuestionDTO) : Observable<QuestionDTO> {
    return this.http.post<QuestionDTO>(environment.server + `/question-data/createQuestion`, question)
  }

  /**
   * Updates an existing question's basic information.
   *
   * @param {QuestionDTO} question - The question data to update
   * @returns {Observable<QuestionDTO>} An Observable that emits the updated QuestionDTO
   */
  updateQuestion(question: QuestionDTO) : Observable<QuestionDTO> {
    return this.http.put<QuestionDTO>(environment.server + `/question-data/updateQuestion`, question)
  }

  /**
   * Updates all aspects of a question including associated data.
   * This method updates the complete question structure including any nested components.
   *
   * @param {detailedQuestionDTO} question - The detailed question data containing all components to update
   * @returns {Observable<detailedQuestionDTO>} An Observable that emits the updated detailedQuestionDTO
   */
  updateWholeQuestion(question: detailedQuestionDTO) : Observable<detailedQuestionDTO> {
    return this.http.post<detailedQuestionDTO>(environment.server + `/question-data/updateWholeQuestion`, question)
  }

  /**
   * Creates a new version of an existing question with updates.
   * Instead of modifying the existing question, this creates a new version with the changes.
   *
   * @param {detailedQuestionDTO} question - The detailed question data for the new version
   * @returns {Observable<detailedQuestionDTO>} An Observable that emits the newly created question version as detailedQuestionDTO
   */
  versionUpdateWholeQuestion(question: detailedQuestionDTO) : Observable<detailedQuestionDTO> {
    return this.http.post<detailedQuestionDTO>(environment.server + `/question-data/versionUpdateWholeQuestion`, question)
  }

  /**
   * Creates a new free text question.
   *
   * @param {freeTextQuestionDTO} freeTextQuestion - The free text question data to create
   * @returns {Observable<freeTextQuestionDTO>} An Observable that emits the created freeTextQuestionDTO
   */
  createFreeTextQuestion(freeTextQuestion: freeTextQuestionDTO) : Observable<freeTextQuestionDTO> {
    return this.http.post<freeTextQuestionDTO>(environment.server + `/question-data/createFreeTextQuestion`, freeTextQuestion)
  }

  /**
   * Creates a new upload question.
   *
   * @param {uploadQuestionDTO} uploadQuestion - The upload question data to create
   * @returns {Observable<uploadQuestionDTO>} An Observable that emits the created uploadQuestionDTO
   */
  createUploadQuestion(uploadQuestion: uploadQuestionDTO) : Observable<uploadQuestionDTO> {
    return this.http.post<uploadQuestionDTO>(environment.server + `/question-data/createUploadQuestion`, uploadQuestion)
  }

  /* updateFreeTextQuestion(freeTextQuestion: freeTextQuestionDTO) : Observable<freeTextQuestionDTO> {
    return this.http.put<freeTextQuestionDTO>(environment.server + `/question-data/updateFreeTextQuestion`, freeTextQuestion)
  } */

  /* updateCodingQuestion(question: detailedQuestionDTO) : Observable<QuestionDTO> {
    return this.http.put<detailedQuestionDTO>(environment.server + `/question-data/updateCodingQuestion`, question)
  } */


  /**
   * Creates a new multiple choice question.
   * This method sends a POST request to create a new MC question in the database.
   *
   * @param {McQuestionDTO} mcQuestion - The multiple choice question data to create
   * @returns {Observable<McQuestionDTO>} An Observable that emits the created McQuestionDTO
   */
  createMcQuestion(mcQuestion: McQuestionDTO) : Observable<McQuestionDTO> {
    return this.http.post<McQuestionDTO>(environment.server + `/question-data/createMcQuestion`, mcQuestion)
  }

  /**
   * Creates multiple choice options for a question.
   * This method sends a POST request to create multiple options at once.
   *
   * @param {MCOptionDTO[]} mcOptions - Array of multiple choice option data to create
   * @returns {Observable<MCOptionDTO[]>} An Observable that emits an array of created MCOptionDTO objects
   */
  createOptions(mcOptions: MCOptionDTO[]) : Observable<MCOptionDTO[]> {
    return this.http.post<MCOptionDTO[]>(environment.server + `/question-data/createOptions`, mcOptions)
  }

  /**
   * Creates a link between a multiple choice question and an option.
   * This method associates an option with a specific MC question by creating a join record.
   *
   * @param {McQuestionOptionDTO} mcQuestionOption - The data linking a question to an option
   * @returns {Observable<McQuestionOptionDTO>} An Observable that emits the created McQuestionOptionDTO
   */
  createMcQuestionOption(mcQuestionOption: McQuestionOptionDTO) : Observable<McQuestionOptionDTO> {
    return this.http.post<McQuestionOptionDTO>(environment.server + `/question-data/createMcQuestionOption`, mcQuestionOption)
  }

  /**
   * Opens a dialog for a specific task type.
   * @param {string} taskType - The type of the task.
   * @param {MatDialogConfig} config - The configuration for the dialog.
   * @returns {MatDialogRef<McTaskComponent | FreeTextTaskComponent | FillinTaskNewComponent> | undefined} The dialog reference or undefined if no dialog is defined.
   */
  openDialog(taskType: string, config: MatDialogConfig): MatDialogRef<McTaskComponent | FreeTextTaskComponent | FillinTaskNewComponent> | undefined {
    switch (taskType) {
      case questionType.SINGLECHOICE:
      case questionType.MULTIPLECHOICE:
        return this.dialog.open(McTaskComponent, config);
      case questionType.FREETEXT:
        return this.dialog.open(FreeTextTaskComponent, config);
      case questionType.FILLIN:
        return this.dialog.open(FillinTaskNewComponent, { ...config, width: '50vw' });
      default:
        console.warn(`No dialog defined for task type: ${taskType}`);
        return undefined;
    }
  }

}

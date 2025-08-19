import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { of } from 'rxjs';
import {
  FillinQuestionDTO,
  MCOptionViewDTO,
  McQuestionDTO,
  QuestionDTO,
  UserAnswerDataDTO,
  freeTextQuestionDTO,
  userAnswerFeedbackDTO,
} from '@DTOs/index';
import { FillinQuestionType } from '@DTOs/index';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { McTaskComponent } from 'src/app/Pages/contentView/contentElement/mcTask/mcTask.component';
import { FillinTaskNewComponent } from 'src/app/Pages/contentView/contentElement/fill-in-task-new/fill-in-task-new.component';
import { FreeTextTaskComponent } from 'src/app/Pages/contentView/contentElement/free-text-task/free-text-task.component';

/**
 * Mock service that provides fake data for question components
 * Used to avoid real HTTP requests when displaying example questions
 */
@Injectable()
export class MockQuestionDataService {
  constructor(private readonly dialog: MatDialog) {}

  /**
   * Returns mock question data
   */
  getQuestionData(questionId: number): Observable<QuestionDTO> {
    return of({
      id: questionId,
      name: 'Beispiel Multiple-Choice Frage',
      description: 'Eine Beispielfrage',
      score: 10,
      type: 'MultipleChoice',
      text: 'Welche der folgenden Aussagen sind korrekt?',
      conceptNodeId: 1,
      isApproved: true,
      originId: -1,
      level: 1,
    });
  }

  /**
   * Returns mock MC question data
   */
  getMCQuestion(questionVersionId: number): Observable<McQuestionDTO> {
    return of({
      id: questionVersionId,
      questionId: questionVersionId,
      isSC: false,
      shuffleOptions: true,
      questionVersion: {
        id: 1,
        version: 1,
        isApproved: true,
        questionId: questionVersionId,
        successor: null,
      },
      mcQuestionOption: [
        {
          id: 1,
          mcQuestionId: questionVersionId,
          option: { id: 1, text: 'Diese Aussage ist richtig.', correct: true },
        },
        {
          id: 2,
          mcQuestionId: questionVersionId,
          option: { id: 2, text: 'Diese Aussage ist falsch.', correct: false },
        },
        {
          id: 3,
          mcQuestionId: questionVersionId,
          option: { id: 3, text: 'Auch diese Aussage ist richtig.', correct: true },
        },
      ],
    });
  }

  /**
   * Returns mock MC options
   */
  getMCOptions(questionId: number): Observable<MCOptionViewDTO[]> {
    return of([
      { id: 1, text: 'Diese Aussage ist richtig.', selected: false },
      { id: 2, text: 'Diese Aussage ist falsch.', selected: false },
      { id: 3, text: 'Auch diese Aussage ist richtig.', selected: false },
    ]);
  }

  /**
   * Returns mock free text question data
   */
  getFreeTextQuestion(questionVersionId: number): Observable<freeTextQuestionDTO> {
    return of({
      questionId: questionVersionId,
      contentElementId: 1,
      title: 'Beispiel Freitext Frage',
      text: 'Beschreiben Sie in eigenen Worten, was Sie unter dem Begriff "Programmierung" verstehen.',
      expectations: 'Der Nutzer soll die Grundkonzepte der Programmierung erklären.',
      maxPoints: 10,
    });
  }

  /**
   * Returns mock user answer data
   */
  getNewestUserAnswer(questionId: number, userId: number = -1): Observable<UserAnswerDataDTO> {
    return of({
      id: 1,
      questionId: questionId,
      contentElementId: 1,
      userId: userId,
      userFreetextAnswer: 'Dies ist eine Beispielantwort für die Freitext-Aufgabe.',
    });
  }

  /**
   * Returns mock fill-in task data
   */
  getFillinTask(questionId: number): Observable<FillinQuestionDTO> {
    return of({
      id: questionId,
      taskType: FillinQuestionType.FillinDrag,
      question: {
        id: questionId,
        name: 'Beispiel Lückentext Aufgabe',
        description: 'Füllen Sie die Lücken aus',
        score: 10,
        type: 'FillIn',
        text: 'Füllen Sie die Lücken im folgenden Text aus.',
        conceptNodeId: 1,
        isApproved: true,
        originId: -1,
        level: 1,
      },
      content: `<p>Angular ist ein <span class="generated-blank" data-position="1"></span> zur Erstellung von <span class="generated-blank" data-position="2"></span>. Es verwendet <span class="generated-blank" data-position="3"></span> als Programmiersprache.</p>`,
      blanks: [
        { id: 1, position: '1', blankContent: 'Framework' },
        { id: 2, position: '2', blankContent: 'Webanwendungen' },
        { id: 3, position: '3', blankContent: 'TypeScript' },
        { id: 4, position: '0', blankContent: 'JavaScript' },
        { id: 5, position: '0', blankContent: 'Komponenten' },
      ],
    });
  }

  /**
   * Mock user answer creation that returns success feedback
   */
  createUserAnswer(data: UserAnswerDataDTO): Observable<userAnswerFeedbackDTO> {
    return of({
      id: 1,
      userAnswerId: 1,
      score: 10,
      feedbackText: 'Sehr gut! Alle Antworten sind korrekt.',
      elementDone: true,
      progress: 100,
    });
  }

  /**
   * Opens a dialog for a task using the mock service
   */
  openDialog(
    taskType: string,
    config: MatDialogConfig,
  ): MatDialogRef<McTaskComponent | FreeTextTaskComponent | FillinTaskNewComponent> | undefined {
    const modifiedConfig = {
      ...config,
      providers: [{ provide: QuestionDataService, useClass: MockQuestionDataService }],
    };

    switch (taskType) {
      case 'SingleChoice':
      case 'MultipleChoice':
        return this.dialog.open(McTaskComponent, modifiedConfig);
      case 'FreeText':
        return this.dialog.open(FreeTextTaskComponent, modifiedConfig);
      case 'FillIn':
        return this.dialog.open(FillinTaskNewComponent, { ...modifiedConfig, width: '50vw' });
      default:
        console.warn(`No dialog defined for task type: ${taskType}`);
        return undefined;
    }
  }
}

/**
 * Actual service reference to avoid import error in the mock service
 */
import { QuestionDataService } from './question-data.service';

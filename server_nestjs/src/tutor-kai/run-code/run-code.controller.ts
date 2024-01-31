import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import { RunCodeService } from './run-code.service';
import { FeedbackNormalService } from './feedback_normal.service';
import { FeedbackRAGService } from './feedback_rag.service';
import { CodeSubmissionResultDto, Judge0Dto } from '@DTOs/index';
import { StudentRatingService } from './student-rating.service';
import { Response } from 'express';

@Controller('run-code')
export class RunCodeController {
  constructor(
    private readonly runCodeService: RunCodeService,
    private readonly feedbackRAGService: FeedbackRAGService,
    private readonly feedbackNormalService: FeedbackNormalService,
    private readonly studentRatingService: StudentRatingService,
  ) { }

  /**
   * executeCode - executes the given code and returns the result.
   *
   * @param {string} code - the code to execute
   * @param {string} language - the programming language of the code
   * @param {number} taskId - the associated task ID
   * @result returns a CodeSubmissionResultDto
   */
  @Post('execute-code')
  async executeCode(
    @Body('code') code: string,
    @Body('language') language: string,
    @Body('taskId') taskId: number,
    @Req() req,
  ): Promise<CodeSubmissionResultDto> {
    return await this.runCodeService.executeCode(req, code, language, taskId);
  }

  /**
   * executeMultipleFiles - executes code with multiple files and returns the result.
   *
   * @param {string} code - the main file code to execute
   * @param {string} language - the programming language of the code
   * @param {number} taskId - the associated task ID
   * @param {string[]} inputArgs - user input arguments
   * @param {{ [fileName: string]: string }} additionalFiles - a dictionary containing additional files in which the key is the file name and the value is the file content
   * @result returns a CodeSubmissionResultDto
   */
  @Post('execute-multiple-files')
  async executeMultipleFiles(
    @Req() req,
    @Body('code') code: string,
    @Body('language') language: string,
    @Body('taskId') taskId: number,
    @Body('inputArgs') inputArgs: string[],
    @Body('additionalFiles') additionalFiles: { [fileName: string]: string },
  ): Promise<CodeSubmissionResultDto> {
    return await this.runCodeService.runMultipleFiles(
      req,
      code,
      language,
      taskId,
      inputArgs,
      additionalFiles,
    );
  }

  /**
   * Gets feedback from the AI.
   *
   * @param {string} task - the task description to evaluate code on
   * @param {string} code - the code to evaluate
   * @param {string} language - the programming language of the code
   * @param {CodeSubmissionResultDto} relatedCodeSubmissionResult - CodeSubmissionResultDto: the result of the executed code (containing stdout, stderr, compile_output) and the previous submission ID (for updating the matching tuple in the database)
   * @param {Response} res - the response object to write the KI feedback to
   * @returns {Promise<void>} - a promise that resolves when the KI feedback has been written to the response object
   */
  @Post('evaluate-code')
  async evaluateCode(
    @Body('code') code: string,
    @Body('task') task: string,
    @Body('language') language: string,
    @Body('flavor') flavor: string,
    @Body('relatedCodeSubmissionResult') relatedCodeSubmissionResult: CodeSubmissionResultDto,
    @Res() res: Response
  ): Promise<void> {
    res.set('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    if (flavor == 'Schnelles Feedback') {
      const result = await this.feedbackNormalService.getKiFeedback(
        code,
        task,
        language,
        flavor,
        relatedCodeSubmissionResult,
        res
      );
    }
      if (flavor == 'Feedback mit Vorlesungsinformationen') {
      const result = await this.feedbackRAGService.getKiFeedback(
        code,
        task,
        language,
        flavor,
        relatedCodeSubmissionResult,
        res
      );
    }
  }

  @Post('test')
  async test(): Promise<void> {
    //const test = await this.FeedbackRAGService.getKiFeedback();
  }
  /**
   * postFeedback - submits user feedback to the backend.
   *
   * @param {number} rating - rating given by the user
   * @param {string} feedback - feedback given by the user
   * @param {string} lastSubmissionId - the previous submission ID (for updating the matching tuple in the database)
   */
  @Post('post-Feedback')
  async postFeedback(
    @Body('rating') rating: number,
    @Body('feedback') feedback: string,
    @Body('lastSubmissionId') lastSubmissionId: string,
  ): Promise<void> {
    await this.studentRatingService.insertStudentFeedback(
      rating,
      feedback,
      lastSubmissionId,
    );
  }
}

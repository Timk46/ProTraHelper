import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import { RunCodeService } from './run-code.service';
import { FeedbackNormalService } from './feedback_normal.service';
import { FeedbackRAGService } from './feedback_rag.service';
import { CodeSubmissionResultDto } from '@DTOs/index';
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

  @Post('execute')
  async execute(
    @Req() req,
    @Body('taskId') taskId: string,
    @Body('inputArgs') inputArgs: string[],
    @Body('CodeFiles') files: { [fileName: string]: string },
  ): Promise<CodeSubmissionResultDto> {
    const results = await this.runCodeService.executeCode(files, parseInt(taskId), req.user.id);
    return results;
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
    @Body('questionId') questionId: number,
    @Body('flavor') flavor: string,
    @Body('relatedCodeSubmissionResult') relatedCodeSubmissionResult: CodeSubmissionResultDto,
    @Res() res: Response,
    @Req() req
  ): Promise<void> {
    res.set('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    if (flavor == 'Schnelles Feedback') {
      const result = await this.feedbackNormalService.getKiFeedback(
        Number(questionId),
        flavor,
        relatedCodeSubmissionResult,
        res,
        req.user.id
      );
    }

      if (flavor == 'Feedback mit Vorlesungsinformationen') {
      const result = await this.feedbackRAGService.getKiFeedback(
        Number(questionId),
        flavor,
        relatedCodeSubmissionResult,
        res,
        req.user.id
      );
    }
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

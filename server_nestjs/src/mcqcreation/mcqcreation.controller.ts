/* eslint-disable prettier/prettier */
import { Controller, Get, Query } from '@nestjs/common';
import { McqCreationService } from './mcqcreation.service';
import { roles } from '@/auth/roles.guard';
interface Answer {
  answer?: string;
  correct?: boolean;
}
@Controller('mcqcreation')
export class McqcreationController {

    constructor(private mcqcreationService: McqCreationService) {}

    /**
     *
     * @param questionId
     * @returns the question
     */
    @Get('answer')
    async getAnswer(@Query('question') question: string, @Query('option') option: string , @Query('otherOptions') otherOptions: string, @Query('concept') concept: string): Promise<Answer> {
      return await this.mcqcreationService.getAnswer(question, option, otherOptions, concept);
    }

    /**
     *
     * @param questionId
     * @returns the question
     */
    @Get('answers')
    async getAnswers(@Query('question') question:string, @Query('options') options: number, @Query('concept') concept: string ): Promise<{answers: Answer[], description: string, score: number}> {
      return await this.mcqcreationService.getAnswers(options,question, concept);
    }

    /**
     *
     * @param concept
     * @param options
     * @returns suggested question and answers
     */
    @Get('questionAndAnswers')
    async getQuestionAndAnswers(@Query('concept') concept: string, @Query('options') options: number): Promise<{question: string, answer: Answer[], description: string, score: number}> {
      return await this.mcqcreationService.getQuestionAndAnswers(concept, options);
    }

    /**
     * @param question
     * @param concept
     * @param options
     * @returns reevaluated question and answers
     */
    @Get('reevaluatedQuestionAndAnswers')
    async getReevaluatedQuestionAndAnswers(@Query('question') question: string, @Query('concept') concept: string, @Query('options') options: string): Promise<{question: string, answer: Answer[], reasoning: string}> {
      return await this.mcqcreationService.getReevaluatedQuestionAndAnswers(question, concept, options);
    }

    /**
     *
     * @param question
     * @param concept
     * @param answers
     * @returns evaluated answers in text form
     */
    @Get('evaluateOptions')
    async getEvaluation(@Query('question') question: string, @Query('concept') concept: string, @Query('asnwers') answers: {answer: string, correct: boolean}[]): Promise<{answer: Answer[], reasoning: string}> {
      return await this.mcqcreationService.getEvaluation(question, concept, answers);
    }

    @Get('questionTitle')
    async getQuestionTitle(@Query('concept') concept: string): Promise<{question?: string}> {

      return await this.mcqcreationService.getQuestionTitle(concept);
    }

}

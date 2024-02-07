/* eslint-disable prettier/prettier */
import { Controller, Get, Query } from '@nestjs/common';
import { McqCreationService } from './mcqcreation.service';
import { roles } from '@/auth/roles.guard';
import { McqGenerationDTO } from '@Interfaces/question.dto';
interface Answer {
  answer?: string;
  isCorrect?: boolean;
}
@Controller('mcqcreation')
export class McqcreationController {

    constructor(private mcqCreationService: McqCreationService) {}

    /**
     *
     * @param questionId
     * @returns the question
     */
    @Get('answer')
    async getAnswer(@Query('question') question: string, @Query('option') option: string , @Query('otherOptions') otherOptions: string[], @Query('concept') concept: string): Promise<Answer> {
      return await this.mcqCreationService.getAnswer(question, option, otherOptions, concept);
    }

    /**
     *
     * @param questionId
     * @returns the question
     */
    @Get('answers')
    async getAnswers(@Query('question') question:string, @Query('options') options: number, @Query('concept') concept: string ): Promise<McqGenerationDTO> {
      return await this.mcqCreationService.getAnswers(options,question, concept);
    }

    /**
     *
     * @param concept
     * @param options
     * @returns suggested question and answers
     */
    @Get('questionAndAnswers')
    async getQuestionAndAnswers(@Query('concept') concept: string, @Query('options') options: number): Promise<McqGenerationDTO> {
      return await this.mcqCreationService.getQuestionAndAnswers(concept, options);
    }

    /**
     *
     * @param concept
     * @returns
     */
    @Get('questionTitle')
    async getQuestionTitle(@Query('concept') concept: string): Promise<{question?: string}> {
      return await this.mcqCreationService.getQuestionTitle(concept);
    }

    /** NOT IMPELEMENTED YET
     * @param question
     * @param concept
     * @param options
     * @returns reevaluated question and answers
     */
    @Get('reevaluatedQuestionAndAnswers')
    async getReevaluatedQuestionAndAnswers(@Query('question') question: string, @Query('concept') concept: string, @Query('options') options: string): Promise<McqGenerationDTO> {
      return await this.mcqCreationService.getReevaluatedQuestionAndAnswers(question, concept, options);
    }

    /** NOT IMPELEMENTED YET
     *
     * @param question
     * @param concept
     * @param answers
     * @returns evaluated answers in text form
     */
    @Get('evaluateOptions')
    async getEvaluation(@Query('question') question: string, @Query('concept') concept: string, @Query('answers') answers: {answer: string, isCorrect: boolean}[]): Promise<{evaluations?: {answer?: string, isCorrect?: boolean}[], reasoning?: string}> {
      return await this.mcqCreationService.getEvaluation(question, concept, answers);
    }



}

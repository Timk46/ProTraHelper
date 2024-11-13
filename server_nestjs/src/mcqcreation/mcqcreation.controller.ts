/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { McqCreationService } from './mcqcreation.service';
import { roles, RolesGuard } from '@/auth/roles.guard';
import { McqGenerationDTO } from '@DTOs/question.dto';
import { OptionDTO } from '@DTOs/question.dto';
interface Answer {
  answer?: string;
  isCorrect?: boolean;
}

interface McqEvaluation {
  correct?: boolean;
  reasoning?: string;
}
interface McqEvaluations {
  evaluations?: McqEvaluation[];
}

@UseGuards(RolesGuard)
@Controller('mcqcreation')
export class McqcreationController {

    constructor(private mcqCreationService: McqCreationService) {}

    /**
     *
     * @param questionId
     * @returns the question
     */
    @roles('ADMIN')
    @Post('answer')
    async getAnswer(
      @Body() answerData: {
        question: string;
        option: OptionDTO;
        otherOptions: OptionDTO[];
        concept: string;
      }
    ): Promise<Answer> {
      return await this.mcqCreationService.getAnswer(
        answerData.question,
        answerData.option,
        answerData.otherOptions,
        answerData.concept
      );
    }

    /**
     *
     * @param questionId
     * @returns the question
     */
    @roles('ADMIN')
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
    @roles('ADMIN')
    @Get('questionAndAnswers')
    async getQuestionAndAnswers(@Query('concept') concept: string, @Query('options') options: number, @Query('topic') topic: string = undefined): Promise<McqGenerationDTO> {
      return await this.mcqCreationService.getQuestionAndAnswers(concept, options, topic);
    }

    /**
     *
     * @param concept
     * @returns
     */
    @roles('ADMIN')
    @Get('questionTitle')
    async getQuestionTitle(@Query('concept') concept: string): Promise<{question?: string}> {
      return await this.mcqCreationService.getQuestionTitle(concept);
    }

    /** NOT IMPELEMENTED YET
     *
     * @param question
     * @param concept
     * @param answers
     * @returns evaluated answers in text form
     */
    @roles('ADMIN')
    @Get('evaluateOptions')
    async getEvaluation(@Query('question') question: string, @Query('answers') answers: string[]): Promise<McqEvaluations> {
      console.log("question in controller",question);
      console.log("answers in controller",answers);
      return await this.mcqCreationService.getEvaluation(question, answers);
    }



}

/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Param, Body, Req, UseGuards, Delete } from '@nestjs/common';
import { QuestionDataService } from './question-data.service';
import { UserAnswerDataDTO } from '@DTOs/userAnswer.dto';
import { RolesGuard, roles } from '@/auth/roles.guard';
import { MCOptionDTO, McQuestionDTO, McQuestionOptionDTO, QuestionDTO } from '@Interfaces/question.dto';
import { uptime } from 'process';
import { th } from '@faker-js/faker';

//@UseGuards(RolesGuard)
@Controller('question-data')
export class QuestionDataController {
    constructor(private questionDataService: QuestionDataService) {}

    /**
     *
     * @param questionId
     * @returns the question
     */
    @Get(':questionId')
    async getQuestion(@Param('questionId') questionId: number) {
        return this.questionDataService.getQuestion(questionId);
    }

    /**
     *
     * @param questionVersionId
     * @returns the mc question
     */
    @Get('/mcQuestion/:questionVersionId')
    async getMCQuestion(@Param('questionVersionId') questionVersionId: number) {
        return this.questionDataService.getMCQuestion(questionVersionId);
    }

    /**
     *
     * @param mcQuestionId
     * @returns the mc options for the mc question
     */
    @Get('/mcOptions/:mcQuestionId')
    async getMCOptions(@Param('mcQuestionId') mcQuestionId: number) {
        return this.questionDataService.getMCOptions(mcQuestionId);
    }

    /**
     *
     * @param questionVersionId
     * @returns the free text question
     */
    @Get('/freeTextQuestion/:questionVersionId')
    async getFreeTextQuestion(@Param('questionVersionId') questionVersionId: number) {
        return this.questionDataService.getFreeTextQuestion(questionVersionId);
    }

    @Get('/newestUserAnswer/:questionId/:userId')
    async getNewestUserAnswer(@Param('questionId') questionId: number, @Param('userId') userId: number, @Req() req: any) {
        if (isNaN(questionId) || isNaN(userId)) {
            throw new Error('Invalid questionId or userId');
        }
        if (req.user.role == 'ADMIN' || req.user.role == 'TEACHER'){
            return this.questionDataService.getNewestUserAnswer(Number(questionId), Number(userId));
        } else {
            return this.questionDataService.getNewestUserAnswer(Number(questionId), Number(req.user.id));
        } 
    }

    /**
     *
     * @param data
     * @param req
     * @returns the the new user answer
     */
    //@roles('ANY')
    @Post('userAnswer/create')
    async createUserAnswer(@Body() data: UserAnswerDataDTO, @Req() req: any) {
        console.log('createUserAnswer data' + ' ' + data.contentElementId + ' ' + req.user.id);
        return this.questionDataService.createUserAnswer(req.user.id, data);
    }

    @Post('userMCOptionSelected/create')
    async createUserMCOptionSelected(@Body() data: {userAnswerId: number, mcOptionId: number}) {
        return this.questionDataService.createUserMCOptionSelected(data.userAnswerId, data.mcOptionId);
    }

    /**
     *
     * @param question
     * @returns the created Question
     */
    @roles('ANY')
    @Post('/createQuestion')
    async createQuestion(@Body() question: QuestionDTO) {
      console.log('createQuestion question author', question.author);
        return this.questionDataService.createQuestion(question);
    }

    /**
     *
     * @param mcOptions
     * @returns the created MCOptions
     */
    @roles('ANY')
    @Post('/createOptions')
    async createOptions(@Body() mcOptions: MCOptionDTO[]) {
        return await this.questionDataService.createOptions(mcOptions);
    }


    /**
     *
     * @param mcQuestion
     * @returns the created McQuestion
     */
    @roles('ANY')
    @Post('/createMcQuestion')
    async createMcQuestion(@Body() mcQuestion: McQuestionDTO) {
        return await this.questionDataService.createMcQuestion(mcQuestion);
    }


    /**
     *
     * @param mcQuestionOption
     * @returns the created McQuestionOption
     */
    @roles('ANY')
    @Post('/createMcQuestionOption')
    async createMcQuestionOption(@Body() mcQuestionOption: McQuestionOptionDTO) {
        return await this.questionDataService.createMcQuestionOption(mcQuestionOption);
    }


}

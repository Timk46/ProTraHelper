import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { QuestionDataService } from './question-data.service';

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

    @Get('/questionVersion/:questionId')
    async getQuestionVersion(@Param('questionId') questionId: number) {
        return this.questionDataService.getQuestionVersion(questionId);
    }
    
    @Get('/newestQuestionVersion/:questionId')
    async getNewestQuestionVersion(@Param('questionId') questionId: number) {
        return this.questionDataService.getNewestQuestionVersion(questionId);
    }

    @Get('/mcQuestion/:questionVersionId')
    async getMCQuestion(@Param('questionVersionId') questionVersionId: number) {
        return this.questionDataService.getMCQuestion(questionVersionId);
    }

    @Get('/mcOptions/:mcQuestionId')
    async getMCOptions(@Param('mcQuestionId') mcQuestionId: number) {
        return this.questionDataService.getMCOptions(mcQuestionId);
    }
    
    @Post('userMCAnswer/create')
    async createUserMCAnswer(@Body() data: {userId: number, mcQuestionId: number}) {
        console.log(data.userId);
        return this.questionDataService.createUserMCAnswer(data.userId, data.mcQuestionId);  
    }

    @Post('userMCOptionSelected/create')
    async createUserMCOptionSelected(@Body() data: {userMCAnswerId: number, mcOptionId: number}) {
        return this.questionDataService.createUserMCOptionSelected(data.userMCAnswerId, data.mcOptionId);
    }
}
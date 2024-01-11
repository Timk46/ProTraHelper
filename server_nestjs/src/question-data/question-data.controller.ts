import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { QuestionDataService } from './question-data.service';
import { UserAnswerDataDTO } from '@Interfaces/question.dto';
import { RolesGuard, roles } from '@/auth/roles.guard';

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
    
    /* @Post('userAnswer/create')
    async createUserMCAnswer(@Body() data: {userId: number, questionId: number}) {
        console.log(data.userId);
        return this.questionDataService.createUserAnswer(data.userId, data.questionId);  
    } */
    //@roles('ANY')
    @Post('userAnswer/create')
    async createUserMCAnswer(@Body() data: UserAnswerDataDTO, @Req() req: any) {
        console.log(data.userId);
        return this.questionDataService.createUserAnswer(req.user.id, data);  
    }

    @Post('userMCOptionSelected/create')
    async createUserMCOptionSelected(@Body() data: {userAnswerId: number, mcOptionId: number}) {
        return this.questionDataService.createUserMCOptionSelected(data.userAnswerId, data.mcOptionId);
    }
}
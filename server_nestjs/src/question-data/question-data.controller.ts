/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Param, Body, Req, UseGuards} from '@nestjs/common';
import { QuestionDataService } from './question-data.service';
import { detailedFreetextQuestionDTO, detailedQuestionDTO, freeTextQuestionDTO, QuestionDTO, UserAnswerDataDTO } from '@DTOs/index';
import { roles, RolesGuard } from '@/auth/roles.guard';

@UseGuards(RolesGuard)
@Controller('question-data')
export class QuestionDataController {
    constructor(private questionDataService: QuestionDataService) {}

    /**
     *
     * @param questionId
     * @returns the question
     */
    @roles('ANY')
    @Get(':questionId')
    async getQuestion(@Param('questionId') questionId: number) {
        return this.questionDataService.getQuestion(questionId);
    }

    @roles('ADMIN')
    @Get('detailed/:questionId')
    async getDetailedQuestion(@Param('questionId') questionId: number): Promise<detailedQuestionDTO> {
        return this.questionDataService.getDetailedQuestion(questionId);
    }

    /**
     *
     * @param questionVersionId
     * @returns the mc question
     */
    @roles('ANY')
    @Get('/mcQuestion/:questionVersionId')
    async getMCQuestion(@Param('questionVersionId') questionVersionId: number) {
        return this.questionDataService.getMCQuestion(questionVersionId);
    }

    /**
     *
     * @param mcQuestionId
     * @returns the mc options for the mc question
     */
    @roles('ANY')
    @Get('/mcOptions/:mcQuestionId')
    async getMCOptions(@Param('mcQuestionId') mcQuestionId: number) {
        return this.questionDataService.getMCOptions(mcQuestionId);
    }

    /**
     *
     * @param questionId
     * @returns the free text question
     */
    @roles('ANY')
    @Get('/freeTextQuestion/:questionId')
    async getFreeTextQuestion(@Param('questionId') questionId: number): Promise<freeTextQuestionDTO> {
        return this.questionDataService.getFreeTextQuestion(questionId);
    }

    @roles('ANY')
    @Get('/newestUserAnswer/:questionId/:userId')
    async getNewestUserAnswer(@Param('questionId') questionId: number, @Param('userId') userId: number, @Req() req: any) {
        if (isNaN(questionId) || isNaN(userId)) {
            throw new Error('Invalid questionId or userId');
        }
        if (req.user.role == 'ADMIN' || req.user.role == 'TEACHER'){
            return this.questionDataService.getNewestUserAnswer(Number(questionId), Number(req.user.id));
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
    @roles('ANY')
    @Post('userAnswer/create')
    async createUserAnswer(@Body() data: UserAnswerDataDTO, @Req() req: any) {
        console.log('createUserAnswer data' + ' ' + data.contentElementId + ' ' + req.user.id);
        return this.questionDataService.createUserAnswer(req.user.id, data);
    }

    @roles('ANY')
    @Post('userMCOptionSelected/create')
    async createUserMCOptionSelected(@Body() data: {userAnswerId: number, mcOptionId: number}) {
        return this.questionDataService.createUserMCOptionSelected(data.userAnswerId, data.mcOptionId);
    }



    @roles('ADMIN')
    @Post('/createQuestion')
    /**
     * Creates a new question.
     *
     * @param question - The question data.
     * @param req - The request object.
     * @returns A promise that resolves to the created question.
     */
    async createQuestion( @Body() question: QuestionDTO, @Req() req: any): Promise<QuestionDTO> {
        return this.questionDataService.createQuestion(question, req.user.id);
    }

    @roles('ADMIN')
    @Post('/updateWholeQuestion')
    /**
     * Updates a question.
     *
     * @param question The question to be updated.
     * @returns A promise that resolves to the updated question.
     */
    async updateWholeQuestion( @Body() question: detailedQuestionDTO, @Req() req: any): Promise<detailedQuestionDTO> {
        return this.questionDataService.updateWholeQuestion(question, req.user.id);
    }


    /**
     *
     * @param mcOptions
     * @returns the created MCOptions
     */
    /** Aus Sicherheitsgründen erst mal entfernt.
    @roles('ANY')
    @Post('/createOptions')
    async createOptions(@Body() mcOptions: MCOptionDTO[]) {
        return await this.questionDataService.createOptions(mcOptions);
    }
*/

    /**
     *
     * @param mcQuestion
     * @returns the created McQuestion
     */
    /** Aus Sicherheitsgründen erst mal entfernt.
    @roles('ANY')
    @Post('/createMcQuestion')
    async createMcQuestion(@Body() mcQuestion: McQuestionDTO) {
        return await this.questionDataService.createMcQuestion(mcQuestion);
    }
*/

    /**
     *
     * @param mcQuestionOption
     * @returns the created McQuestionOption
     */
    /** Aus Sicherheitsgründen erst mal entfernt.
    @roles('ANY')
    @Post('/createMcQuestionOption')
    async createMcQuestionOption(@Body() mcQuestionOption: McQuestionOptionDTO) {
        return await this.questionDataService.createMcQuestionOption(mcQuestionOption);
    }
*/

}

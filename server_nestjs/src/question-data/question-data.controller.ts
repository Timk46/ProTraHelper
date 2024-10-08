/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Param, Body, Req, UseGuards, Put} from '@nestjs/common';
import { QuestionDataService } from './question-data.service';
import { detailedFreetextQuestionDTO, detailedQuestionDTO, freeTextQuestionDTO, QuestionDTO, UserAnswerDataDTO, questionType, graphQuestionDTO } from '@DTOs/index';
import { roles, RolesGuard } from '@/auth/roles.guard';
import { EditCodeService } from './edit-code.service';
import { QuestionDataChoiceService } from './question-data-choice/question-data-choice.service';
import { QuestionDataFreetextService } from './question-data-freetext/question-data-freetext.service';
import { QuestionDataCodeService } from './question-data-code/question-data-code.service';
import { QuestionDataFillinService } from './question-data-fillin/question-data-fillin.service';
import { QuestionDataGraphService } from './question-data-graph/question-data-graph.service';

@UseGuards(RolesGuard)
@Controller('question-data')
export class QuestionDataController {
    constructor(
      private questionDataService: QuestionDataService,
      private editCodeService: EditCodeService,
      private qdChoiceService: QuestionDataChoiceService,
      private qdFreetextService: QuestionDataFreetextService,
      private qdGraphService: QuestionDataGraphService,
      private qdCodeService: QuestionDataCodeService,
      private qdFillinService: QuestionDataFillinService,

    ) {}

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
    @Post('detailed')
    async getDetailedQuestion(@Body() data: { questionId: number, questionType: string }): Promise<detailedQuestionDTO> {
        return this.questionDataService.getDetailedQuestion(data.questionId, data.questionType);
    }

    /* @roles('ADMIN')
    @Put('/updateCodingQuestion')
    async updateCodingQuestion(@Body() question: detailedQuestionDTO): Promise<QuestionDTO> {
      return this.qdCodeService.updateCodingQuestion(question);
    } */

    /**
     *
     * @param questionVersionId
     * @returns the mc question
     */
    @roles('ANY')
    @Get('/mcQuestion/:questionVersionId')
    async getMCQuestion(@Param('questionVersionId') questionVersionId: number) {
        return this.qdChoiceService.getMCQuestion(questionVersionId);
    }

    /**
     *
     * @param mcQuestionId
     * @returns the mc options for the mc question
     */
    @roles('ANY')
    @Get('/mcOptions/:mcQuestionId')
    async getMCOptions(@Param('mcQuestionId') mcQuestionId: number) {
        return this.qdChoiceService.getMCOptions(mcQuestionId);
    }

    /**
     *
     * @param questionId
     * @returns the free text question
     */
    @roles('ANY')
    @Get('/freeTextQuestion/:questionId')
    async getFreeTextQuestion(@Param('questionId') questionId: number): Promise<freeTextQuestionDTO> {
        return this.qdFreetextService.getFreeTextQuestion(questionId);
    }
    
    /**
     *
     * @param questionId
     * @returns the graph question
     */
    @roles('ANY')
    @Get('/graphQuestion/:questionId')
    async getGraphQuestion(@Param('questionId') questionId: number): Promise<graphQuestionDTO> {
        return this.qdGraphService.getGraphQuestion(questionId);
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
        return this.qdChoiceService.createUserMCOptionSelected(data.userAnswerId, data.mcOptionId);
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
    @Post('updateWholeQuestion')
    /**
     * Updates a question.
     *
     * @param question The question to be updated.
     * @returns A promise that resolves to the updated question.
     */
    async updateWholeQuestion( @Body() question: detailedQuestionDTO, @Req() req: any): Promise<detailedQuestionDTO> {
      return this.questionDataService.updateWholeQuestion(question, req.user.id);
    }

    @roles('ADMIN')
    @Post('versionUpdateWholeQuestion')
    /**
     * Updates the whole question with the provided data.
     *
     * @param question - The detailed question DTO containing the updated question data.
     * @param req - The request object.
     * @returns A promise that resolves to the updated detailed question DTO.
     */
    async versionUpdateWholeQuestion( @Body() question: detailedQuestionDTO, @Req() req: any): Promise<detailedQuestionDTO> {
        return this.questionDataService.updateWholeQuestion(question, req.user.id, true);
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

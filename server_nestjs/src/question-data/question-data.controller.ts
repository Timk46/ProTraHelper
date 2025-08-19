/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Param, Body, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { QuestionDataService } from './question-data.service';
import { detailedQuestionDTO, freeTextQuestionDTO, QuestionDTO, UserAnswerDataDTO, FillinQuestionDTO, GraphQuestionDTO, userAnswerFeedbackDTO, MCOptionDTO, McQuestionDTO, MCOptionViewDTO, UserMCOptionSelectedDTO, uploadQuestionDTO, questionType, UserUploadAnswerListItemDTO, GroupReviewStatusDTO } from '@DTOs/index';
import { roles, RolesGuard } from '@/auth/common/guards/roles.guard';
import { QuestionDataChoiceService } from './question-data-choice/question-data-choice.service';
import { QuestionDataFreetextService } from './question-data-freetext/question-data-freetext.service';
import { QuestionDataFillinService } from './question-data-fillin/question-data-fillin.service';
import { QuestionDataGraphService } from './question-data-graph/question-data-graph.service';
import { QuestionDataUploadService } from './question-data-upload/question-data-upload.service';
import { QuestionDataGroupReviewGateService } from './question-data-groupreviewgate/question-data-groupreviewgate.service';


@UseGuards(RolesGuard)
@Controller('question-data')
export class QuestionDataController {
  constructor(
    private readonly questionDataService: QuestionDataService,
    private readonly qdChoiceService: QuestionDataChoiceService,
    private readonly qdFreetextService: QuestionDataFreetextService,
    private readonly qdGraphService: QuestionDataGraphService,
    private readonly qdFillinService: QuestionDataFillinService,
    private readonly qdUploadService: QuestionDataUploadService,
      private qdGroupReviewGateService: QuestionDataGroupReviewGateService
  ) {}

        /**
         * @description Retrieves a question by its ID.
         * @param {number} questionId - The ID of the question.
         * @returns {Promise<QuestionDTO>} The question data.
         */
        @roles('ANY')
        @Get(':questionId')
        async getQuestion(@Param('questionId', ParseIntPipe) questionId: number) {
            return this.questionDataService.getQuestion(questionId);
        }

        /**
         * @description Retrieves detailed information about a question based on its ID and type.
         * @param {detailedQuestionDTO} data - An object containing the questionId and questionType.
         * @returns {Promise<detailedQuestionDTO>} A promise that resolves to detailedQuestionDTO.
         */
        @roles('ADMIN')
        @Post('detailed')
        async getDetailedQuestion(@Body() data: { questionId: number, questionType: string }, @Req() req: any): Promise<detailedQuestionDTO> {
          return this.questionDataService.getDetailedQuestion(data.questionId, data.questionType, req.user.id);
        }

  /**
   * @description Retrieves the multiple choice question based on the question version ID.
   * @param {number} questionVersionId - The version ID of the question.
   * @returns {Promise<McQuestionDTO>} The mc question data.
   */
  @roles('ANY')
  @Get('/mcQuestion/:questionVersionId')
  async getMCQuestion(
    @Param('questionVersionId') questionVersionId: number,
  ): Promise<McQuestionDTO> {
    return this.qdChoiceService.getMCQuestion(questionVersionId);
  }

  /**
   * @description Retrieves the multiple choice options for a given mc question.
   * @param {number} mcQuestionId - The ID of the multiple choice question.
   * @returns {Promise<MCOptionViewDTO[]>} The mc options associated with the question.
   */
  @roles('ANY')
  @Get('/mcOptions/:mcQuestionId')
  async getMCOptions(@Param('mcQuestionId') mcQuestionId: number): Promise<MCOptionViewDTO[]> {
    return this.qdChoiceService.getMCOptions(mcQuestionId);
  }

  /**
   * @description Retrieves the free text question based on question ID.
   * @param {number} questionId - The ID of the free text question.
   * @returns {Promise<freeTextQuestionDTO>} A promise that resolves to freeTextQuestionDTO.
   */
  @roles('ANY')
  @Get('/freeTextQuestion/:questionId')
  async getFreeTextQuestion(@Param('questionId') questionId: number): Promise<freeTextQuestionDTO> {
    return this.qdFreetextService.getFreeTextQuestion(questionId);
  }

  /**
   * @description Retrieves the graph question based on question ID.
   * @param {number} questionId - The ID of the graph question.
   * @returns {Promise<GraphQuestionDTO>} A promise that resolves to GraphQuestionDTO.
   */
  @roles('ANY')
  @Get('/graphQuestion/:questionId')
  async getGraphQuestion(@Param('questionId') questionId: number): Promise<GraphQuestionDTO> {
    return this.qdGraphService.getGraphQuestion(questionId);
  }

        /**
         * @description Retrieves the fill-in question based on fill-in question ID.
         * @param {number} fillinQuestionId - The ID of the fill-in question.
         * @returns {Promise<FillinQuestionDTO>} A promise that resolves to FillinQuestionDTO.
         */
        @roles('ANY')
        @Get('fillinQuestion/:fillinQuestionId')
        async getFillinQuestion(@Param('fillinQuestionId') fillinQuestionId: number): Promise<FillinQuestionDTO> {
            return this.qdFillinService.getFillinQuestion(fillinQuestionId);
        }

        /**
         * @description Retrieves all upload questions.
         * @returns {Promise<uploadQuestionDTO[]>} A promise that resolves to an array of uploadQuestionDTO.
         */
        @roles('ADMIN', 'TEACHER')
        @Get('uploadQuestion/all')
        async getAllUploadQuestions(): Promise<uploadQuestionDTO[]> {
            return this.qdUploadService.getAllUploadQuestions();
        }

        /**
         * Retrieves an upload question by its unique identifier.
        *
        * @param uploadQuestionId - The unique identifier of the upload question to retrieve.
        * @returns A promise that resolves to the corresponding `uploadQuestionDTO`.
        */
        @roles('ANY')
        @Get('uploadQuestion/:uploadQuestionId')
        async getUploadQuestion(@Param('uploadQuestionId') uploadQuestionId: number): Promise<uploadQuestionDTO> {
          return this.qdUploadService.getUploadQuestion(uploadQuestionId);
        }

        /**
         * Retrieves the review statuses for a specific question group for the current user.
        *
        * @param questionId - The ID of the question to get review statuses for.
        * @param req - The request object containing the authenticated user information.
        * @returns A promise that resolves to an array of group review status DTOs.
        */
        @roles('ANY')
        @Get('groupReviewStatuses/:questionId')
        async getGroupReviewStatuses(@Param('questionId', ParseIntPipe) questionId: number, @Req() req: any): Promise<GroupReviewStatusDTO[]> {
          const userId = req.user.id;
          return this.qdGroupReviewGateService.getStatuses(questionId, userId);
        }

        /**
         * @description Retrieves the newest user answer for a given question and user.
         * @param {number} questionId - The ID of the question.
         * @param {number} userId - The ID of the user.
         * @param {any} req - The request object, containing user information.
         * @returns {Promise<UserAnswerDTO>} The newest user answer.
         * @throws Error if questionId or userId is invalid.
         */
        @roles('ADMIN', 'TEACHER')
        @Get('/newestUserAnswer/:questionId/:userId')
        async getNewestUserAnswer(@Param('questionId') questionId: number, @Param('userId') userId: number, @Req() req: any): Promise<UserAnswerDataDTO> {
            if (isNaN(questionId) || isNaN(userId)) {
                throw new Error('Invalid questionId or userId');
            }
            if (req.user.role == 'ADMIN' || req.user.role == 'TEACHER'){
                return this.questionDataService.getNewestUserAnswer(Number(questionId), Number(req.user.id));
            } else {
                return this.questionDataService.getNewestUserAnswer(Number(questionId), Number(req.user.id));
            }
        }

        @roles('ADMIN', 'TEACHER')
        @Get('/allUserUploadAnswers/:questionId?')
        async getAllUserUploadAnswers(
            @Param('questionId', ParseIntPipe) questionId: number,
            @Req() req: any
        ): Promise<UserUploadAnswerListItemDTO[]> {
          console.log('Fetching all user upload answers for questionId:', questionId);
          const temp = await this.qdUploadService.getAllUserUploadAnswers(questionId);
          console.log('User Upload Answers:', temp);
          return temp;
        }

  /**
   * @description Creates a new user answer.
   * @param {UserAnswerDataDTO} data - The user answer data.
   * @param {any} req - The request object, containing user information.
   * @returns {Promise<userAnswerFeedbackDTO>} A promise that resolves to the user answer feedback.
   */
  @roles('ANY')
  @Post('userAnswer/create')
  async createUserAnswer(
    @Body() data: UserAnswerDataDTO,
    @Req() req: any,
  ): Promise<userAnswerFeedbackDTO> {
    return this.questionDataService.createUserAnswer(req.user.id, data);
  }

  /**
   * @description Creates a new user MC option selected record.
   * @param {Partial<UserMCOptionSelectedDTO>} data - An object containing userAnswerId and mcOptionId.
   * @returns {Promise<UserMCOptionSelectedDTO>} The created userMCOptionSelected.
   */
  @roles('ANY')
  @Post('userMCOptionSelected/create')
  async createUserMCOptionSelected(
    @Body() data: Partial<UserMCOptionSelectedDTO>,
  ): Promise<UserMCOptionSelectedDTO> {
    return this.qdChoiceService.createUserMCOptionSelected(data.userAnswerId, data.mcOptionId);
  }

  /**
   * @description Creates a new question.
   * @param {QuestionDTO} question - The question data.
   * @param {any} req - The request object.
   * @returns {Promise<QuestionDTO>} A promise that resolves to the created question.
   */
  @roles('ADMIN')
  @Post('/createQuestion')
  async createQuestion(@Body() question: QuestionDTO, @Req() req: any): Promise<QuestionDTO> {
    return this.questionDataService.createQuestion(question, req.user.id);
  }

  /**
   * @description Updates a question.
   * @param {detailedQuestionDTO} question - The question to be updated.
   * @param {any} req - The request object.
   * @returns {Promise<detailedQuestionDTO>} A promise that resolves to the updated question.
   */
  @roles('ADMIN')
  @Post('updateWholeQuestion')
  async updateWholeQuestion(
    @Body() question: detailedQuestionDTO,
    @Req() req: any,
  ): Promise<detailedQuestionDTO> {
    return this.questionDataService.updateWholeQuestion(question, req.user.id);
  }

  /**
   * @description Updates the whole question with the provided data.
   * @param {detailedQuestionDTO} question - The detailed question DTO containing the updated question data.
   * @param {any} req - The request object.
   * @returns {Promise<detailedQuestionDTO>} A promise that resolves to the updated detailed question DTO.
   */
  @roles('ADMIN')
  @Post('versionUpdateWholeQuestion')
  async versionUpdateWholeQuestion(
    @Body() question: detailedQuestionDTO,
    @Req() req: any,
  ): Promise<detailedQuestionDTO> {
    return this.questionDataService.updateWholeQuestion(question, req.user.id, true);
  }

  /**
   * @description Endpoint to query the progress of a question for a user.
   * @param {number} questionId - The ID of the question to get progress for
   * @param {any} req - The request object.
   * @returns {Promise<{ progress: number }>} The progress of the question as a number between 0-100
   */
  @roles('ANY')
  @Get('progress/:questionId')
  async getProgress(
    @Param('questionId', ParseIntPipe) questionId: number,
    @Req() req: any,
  ): Promise<{ progress: number }> {
    const userId = req.user.id;
    const progress = await this.questionDataService.getQuestionProgress(questionId, userId);
    return { progress };
  }

  /**
   * @description Retrieves the contentNodeIds and contentElementIds associated with a specific question.
   * @param {number} questionId - The ID of the question.
   * @returns {Promise<{ contentNodeId: number, contentElementId: number }>} An object containing arrays of contentNodeIds and contentElementIds.
   */
  @roles('ANY')
  @Get('contentIds/:questionId')
  async getContentIds(
    @Param('questionId', ParseIntPipe) questionId: number,
  ): Promise<{ contentNodeId: number; contentElementId: number }> {
    return this.questionDataService.getContentIdsForQuestion(questionId);
  }
}

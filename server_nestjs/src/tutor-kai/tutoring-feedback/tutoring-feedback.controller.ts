import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards, // Add UseGuards
  InternalServerErrorException, // Add Exception
  NotFoundException, // Add Exception
  ValidationPipe, // Add ValidationPipe
  Logger, // Add Logger
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/common/guards/jwt-auth.guard'; // Add AuthGuard
import { TutoringFeedbackService } from './tutoring-feedback.service';
import { FeedbackContextDto } from '../../../../shared/dtos/tutorKaiDtos/FeedbackContext.dto';
import { FeedbackOutput } from './dtos/feedback-output.schema';
import { LanggraphDataFetcherService } from '../langgraph-feedback/helper/langgraph-data-fetcher.service'; // Import DataFetcherService
import { CodeSubmissionResultDto } from '@DTOs/tutorKaiDtos/submission.dto'; // Import needed DTO

// DTO for the evaluate request (mirrors LanggraphFeedbackController)
interface EvaluateRequestDto {
  questionId: number;
  flavor?: string; // Optional based on reference
  feedbackLevel?: string; // Optional based on reference
  relatedCodeSubmissionResult: CodeSubmissionResultDto;
}

@Controller('tutoring-feedback')
@UseGuards(JwtAuthGuard) // Add AuthGuard
export class TutoringFeedbackController {
  private readonly logger = new Logger(TutoringFeedbackController.name); // Add Logger

  constructor(
    private readonly tutoringFeedbackService: TutoringFeedbackService,
    private readonly langgraphDataFetcherService: LanggraphDataFetcherService, // Inject DataFetcherService
  ) {}

  @Post('structured')
  @HttpCode(HttpStatus.OK) // Explicitly set OK status for successful feedback generation
  async generateFeedback(
    @Body(ValidationPipe) body: EvaluateRequestDto, // Accept EvaluateRequestDto and use ValidationPipe
  ): Promise<FeedbackOutput> {
    this.logger.log(`Tutoring feedback request received for question ${body.questionId}`);
    try {
      // Fetch context using DataFetcherService
      const { questionId, relatedCodeSubmissionResult } = body;
      const { encryptedCodeSubissionId, CodeSubmissionResult } = relatedCodeSubmissionResult;

      if (!encryptedCodeSubissionId || !CodeSubmissionResult) {
        this.logger.error('Missing required fields in relatedCodeSubmissionResult.');
        throw new InternalServerErrorException('Missing required fields in relatedCodeSubmissionResult.');
      }

      const feedbackContext = await this.langgraphDataFetcherService.fetchFeedbackContextDto(
        encryptedCodeSubissionId,
        questionId,
        CodeSubmissionResult,
      );

      const result = await this.tutoringFeedbackService.generateFeedback(feedbackContext); // Call the service with the fetched context
      console.log(JSON.stringify(result)); // Log the result for debugging
      // Call the service with the fetched context
      return result;

    } catch (error) {
      this.logger.error(`Error generating tutoring feedback for question ${body.questionId}:`, error.stack);
      if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error; // Re-throw known exceptions
      }
      throw new InternalServerErrorException('Failed to generate tutoring feedback.');
    }
  }
}

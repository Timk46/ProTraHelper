import {
  Controller,
  Get, // Added Get
  Post,
  Patch, // Added Patch
  Param, // Added Param
  Body,
  Req, // Added Req
  HttpCode,
  HttpStatus,
  UseGuards,
  InternalServerErrorException,
  NotFoundException,
  ValidationPipe,
  Logger,
  BadRequestException, // Added BadRequestException
} from '@nestjs/common';
import { Request } from 'express'; // Added Request
import { PrismaService } from 'src/prisma/prisma.service'; // Added PrismaService
import { IsIn, IsString } from 'class-validator'; // Added class-validator imports
import { JwtAuthGuard } from '../../auth/common/guards/jwt-auth.guard'; // Add AuthGuard
import { TutoringFeedbackService } from './tutoring-feedback.service';
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/feedbackContext.dto';
import { FeedbackOutput } from './graph/schemas/feedback-output.schema';
import { LanggraphDataFetcherService } from '../langgraph-feedback/helper/langgraph-data-fetcher.service';
import { CodeSubmissionResultDto } from '@DTOs/tutorKaiDtos/submission.dto';

// DTO for the evaluate request (mirrors LanggraphFeedbackController)
interface EvaluateRequestDto {
  questionId: number;
  flavor?: string; // Optional based on reference
  feedbackLevel?: string; // Optional based on reference
  relatedCodeSubmissionResult: CodeSubmissionResultDto;
}

interface RequestWithUser extends Request {
  user: {
    id: number;
  };
}

// DTO for the usage tracking request
class TrackUsageDto {
  @IsString()
  @IsIn(['SPS', 'KM', 'KC', 'KH'])
  feedbackType: 'SPS' | 'KM' | 'KC' | 'KH';
}

@Controller('tutoring-feedback')
@UseGuards(JwtAuthGuard) // Add AuthGuard
export class TutoringFeedbackController {
  private readonly logger = new Logger(TutoringFeedbackController.name); // Add Logger

  constructor(
    private readonly tutoringFeedbackService: TutoringFeedbackService,
    private readonly langgraphDataFetcherService: LanggraphDataFetcherService,
    private readonly prisma: PrismaService, // Injected PrismaService
  ) {}

  @Post('structured')
  @HttpCode(HttpStatus.OK) // Explicitly set OK status for successful feedback generation
  async generateFeedback(
    @Body(ValidationPipe) body: EvaluateRequestDto, // Accept EvaluateRequestDto and use ValidationPipe
  ): Promise<{ feedback: FeedbackOutput; feedbackId: string }> {
    // Updated return type
    this.logger.log(`Tutoring feedback request received for question ${body.questionId}`);
    try {
      // Fetch context using DataFetcherService
      const { questionId, relatedCodeSubmissionResult } = body;
      const { encryptedCodeSubissionId, CodeSubmissionResult } = relatedCodeSubmissionResult;

      if (!encryptedCodeSubissionId || !CodeSubmissionResult) {
        this.logger.error('Missing required fields in relatedCodeSubmissionResult.');
        throw new InternalServerErrorException(
          'Missing required fields in relatedCodeSubmissionResult.',
        );
      }

      const feedbackContext = await this.langgraphDataFetcherService.fetchFeedbackContextDto(
        encryptedCodeSubissionId,
        questionId,
        CodeSubmissionResult,
      );

      const result = await this.tutoringFeedbackService.generateFeedback(feedbackContext); // Call the service with the fetched context
      //console.log(JSON.stringify(result)); // Log the result for debugging
      // Call the service with the fetched context
      return result;
    } catch (error) {
      this.logger.error(
        `Error generating tutoring feedback for question ${body.questionId}:`,
        error.stack,
      );
      if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error; // Re-throw known exceptions
      }
      throw new InternalServerErrorException('Failed to generate tutoring feedback.');
    }
  }

  @Patch(':id/usage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async trackFeedbackUsage(
    @Param('id') feedbackId: string,
    @Body(ValidationPipe) body: TrackUsageDto,
  ): Promise<void> {
    const fieldToUpdate = `${body.feedbackType.toLowerCase()}UsedAt`; // e.g., 'spsUsedAt'

    try {
      const result = await this.prisma.generatedFeedback.updateMany({
        where: {
          id: feedbackId,
          [fieldToUpdate]: null, // Only update if the timestamp is not already set
        },
        data: {
          [fieldToUpdate]: new Date(), // Set the timestamp
        },
      });

      if (result.count === 0) {
        // Check if the feedback exists at all
        const feedbackExists = await this.prisma.generatedFeedback.findUnique({
          where: { id: feedbackId },
          select: { id: true },
        });
        if (!feedbackExists) {
          this.logger.warn(`Feedback with ID ${feedbackId} not found for usage tracking.`);
          throw new NotFoundException(`Feedback with ID ${feedbackId} not found.`);
        } else {
          // Feedback exists, but timestamp was likely already set
          this.logger.log(
            `Usage for type ${body.feedbackType} on feedback ${feedbackId} was already tracked.`,
          );
          // Still return success (NO_CONTENT) as the state is effectively what the user requested
        }
      } else {
        this.logger.log(
          `Successfully tracked usage for type ${body.feedbackType} on feedback ${feedbackId}.`,
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Handle potential Prisma errors or other issues
      this.logger.error(`Error tracking usage for feedback ID ${feedbackId}:`, error.stack);
      throw new InternalServerErrorException('Failed to track feedback usage.');
    }
  }

  // --- Privacy Consent Endpoints ---

  @Get('privacy/consent')
  @HttpCode(HttpStatus.OK)
  async getPrivacyConsentStatus(@Req() req: RequestWithUser): Promise<{ hasAccepted: boolean }> {
    const userId = req.user.id; // Extract userId from authenticated user
    if (!userId) {
      this.logger.error('User ID not found in request for privacy consent check.');
      throw new InternalServerErrorException('User not authenticated.');
    }
    this.logger.log(`Checking privacy consent status for user ${userId}`);
    try {
      const hasAccepted = await this.tutoringFeedbackService.getPrivacyConsentStatus(userId);
      return { hasAccepted };
    } catch (error) {
      this.logger.error(`Error checking privacy consent for user ${userId}:`, error.stack);
      if (error instanceof NotFoundException) {
        throw error; // Re-throw if user not found specifically
      }
      throw new InternalServerErrorException('Failed to check privacy consent status.');
    }
  }

  @Post('privacy/consent')
  @HttpCode(HttpStatus.NO_CONTENT)
  async acceptPrivacyPolicy(@Req() req: RequestWithUser): Promise<void> {
    const userId = req.user.id; // Extract userId from authenticated user
    if (!userId) {
      this.logger.error('User ID not found in request for accepting privacy policy.');
      throw new InternalServerErrorException('User not authenticated.');
    }
    this.logger.log(`Accepting privacy policy for user ${userId}`);
    try {
      await this.tutoringFeedbackService.acceptPrivacyPolicy(userId);
    } catch (error) {
      this.logger.error(`Error accepting privacy policy for user ${userId}:`, error.stack);
      if (error instanceof NotFoundException) {
        throw error; // Re-throw if user not found specifically
      }
      throw new InternalServerErrorException('Failed to accept privacy policy.');
    }
  }
}

import { Controller, Post, Body, UseGuards, Req, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/common/guards/jwt-auth.guard';
import { LanggraphFeedbackService } from './langgraph-feedback.service';
import { LanggraphDataFetcherService, FeedbackData } from './langgraph-data-fetcher.service';
import { CodeSubmissionResultDto } from '@DTOs/tutorKaiDtos/submission.dto'; // Adjust path if necessary
import { Request } from 'express'; // Import Request type

// Define the DTO for the request body inline or import if defined elsewhere
interface EvaluateLanggraphDto {
  questionId: number;
  flavor: string; // Included for future use
  feedbackLevel: string; // Included for future use
  relatedCodeSubmissionResult: CodeSubmissionResultDto;
}

@Controller('langgraph-feedback')
@UseGuards(JwtAuthGuard) // Apply authentication guard to the controller
export class LanggraphFeedbackController {
  constructor(
    private readonly langgraphFeedbackService: LanggraphFeedbackService,
    private readonly langgraphDataFetcherService: LanggraphDataFetcherService,
  ) {}

  @Post('evaluate')
  async evaluate(
    @Body() body: EvaluateLanggraphDto,
    @Req() req: Request, // Inject the request object to potentially access user info if needed later
  ): Promise<{ feedback: string | null }> {
    const { questionId, relatedCodeSubmissionResult } = body;
    const { encryptedCodeSubissionId, CodeSubmissionResult } = relatedCodeSubmissionResult;

    if (!encryptedCodeSubissionId || !CodeSubmissionResult) {
        throw new InternalServerErrorException('Missing required fields in relatedCodeSubmissionResult.');
    }

    try {
      // 1. Fetch necessary data using the data fetcher service
      const feedbackData: FeedbackData = await this.langgraphDataFetcherService.fetchFeedbackData(
        encryptedCodeSubissionId,
        questionId,
        CodeSubmissionResult,
      );

      // 2. Call the Langgraph feedback service with the fetched data
      const feedback = await this.langgraphFeedbackService.getFeedback(
        feedbackData.studentSolution,
        feedbackData.taskDescription,
        feedbackData.compilerOutput,
        feedbackData.unitTestResults,
        //feedbackData.attemptCount,
        2,
        feedbackData.automatedTests, // Pass automated tests
        feedbackData.codeGerueste, // Pass code skeletons
      );

      // 3. Return the feedback
      return { feedback };

    } catch (error) {
        // Log the error for debugging
        console.error(`Error during feedback evaluation for question ${questionId}:`, error);

        // Re-throw specific errors or a generic one
        if (error instanceof NotFoundException) {
            throw error; // Re-throw NotFoundException
        }
        // Consider handling other specific errors if needed
        throw new InternalServerErrorException('Failed to generate feedback.');
    }
  }
}

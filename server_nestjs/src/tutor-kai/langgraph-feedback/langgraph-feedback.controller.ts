import { Controller, Post, Body, UseGuards, Req, InternalServerErrorException, NotFoundException, ValidationPipe } from '@nestjs/common'; // Added ValidationPipe
import { JwtAuthGuard } from 'src/auth/common/guards/jwt-auth.guard';
import { LanggraphFeedbackService } from './langgraph-feedback.service';
import { LanggraphDataFetcherService} from './langgraph-data-fetcher.service';
import { CodeSubmissionResultDto } from '@DTOs/tutorKaiDtos/submission.dto'; // Adjust path if necessary
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/FeedbackContext.dto';
import { Request } from 'express'; // Import Request type
import { BaseMessage } from '@langchain/core/messages'; // Import BaseMessage for return type

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
      const FeedbackContextDto: FeedbackContextDto = await this.langgraphDataFetcherService.fetchFeedbackContextDto(
        encryptedCodeSubissionId,
        questionId,
        CodeSubmissionResult,
      );

      // 2. Call the Langgraph feedback service with the fetched data
      const feedback = await this.langgraphFeedbackService.getFeedback(
        FeedbackContextDto.studentSolution,
        FeedbackContextDto.taskDescription,
        FeedbackContextDto.compilerOutput,
        FeedbackContextDto.unitTestResults,
        //FeedbackContextDto.attemptCount,
        2,
        FeedbackContextDto.automatedTests, // Pass automated tests
        FeedbackContextDto.codeGerueste, // Pass code skeletons
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

  // --- New Endpoint for Direct KC Feedback ---
  @Post('kc-direct')
  async getKcDirectFeedback(
    @Body(ValidationPipe) kcInput: FeedbackContextDto, // Use the DTO and ValidationPipe
    // @Req() req: Request, // Keep Req if user context might be needed later
  ): Promise<{ feedbackMessages: BaseMessage[] | null }> {
    try {
      const feedbackMessages = await this.langgraphFeedbackService.getKcFeedbackDirectly(kcInput);
      return { feedbackMessages };
    } catch (error) {
      console.error(`Error during direct KC feedback generation:`, error);
      // Consider more specific error handling if needed
      throw new InternalServerErrorException('Failed to generate direct KC feedback.');
    }
  }
  // --- End New Endpoint ---
}

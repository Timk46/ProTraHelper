import { Controller, Post, Body, UseGuards, Req, InternalServerErrorException, NotFoundException, ValidationPipe, Logger } from '@nestjs/common'; // Added Logger, ValidationPipe
import { JwtAuthGuard } from 'src/auth/common/guards/jwt-auth.guard';
import { LanggraphFeedbackService } from './langgraph-feedback.service'; // Facade service
// Remove DirectAgentService import
import { LanggraphDataFetcherService } from './helper/langgraph-data-fetcher.service';
import { CodeSubmissionResultDto } from '@DTOs/tutorKaiDtos/submission.dto';
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/FeedbackContext.dto';
import { Request } from 'express';
import { BaseMessage, AIMessage } from '@langchain/core/messages'; // Import AIMessage

// DTO for the combined evaluate request
interface EvaluateRequestDto {
  questionId: number;
  flavor: string; // Included for future use
  feedbackLevel: string; // Included for future use
  relatedCodeSubmissionResult: CodeSubmissionResultDto;
}

@Controller('langgraph-feedback')
@UseGuards(JwtAuthGuard)
export class LanggraphFeedbackController {
  private readonly logger = new Logger(LanggraphFeedbackController.name);

  constructor(
    // Inject the facade service
    private readonly langgraphFeedbackService: LanggraphFeedbackService,
    private readonly langgraphDataFetcherService: LanggraphDataFetcherService,
  ) {}

  // Helper to fetch context (avoids repetition)
  private async fetchContext(body: EvaluateRequestDto): Promise<FeedbackContextDto> {
    const { questionId, relatedCodeSubmissionResult } = body;
    const { encryptedCodeSubissionId, CodeSubmissionResult } = relatedCodeSubmissionResult;
    if (!encryptedCodeSubissionId || !CodeSubmissionResult) {
      throw new InternalServerErrorException('Missing required fields in relatedCodeSubmissionResult.');
    }
    return this.langgraphDataFetcherService.fetchFeedbackContextDto(
      encryptedCodeSubissionId,
      questionId,
      CodeSubmissionResult,
    );
  }

  // Helper to extract AI message content
  private extractFeedbackContent(messages: BaseMessage[] | null): string | null {
    if (!messages) return null;
    const aiMsg = messages.find(msg => msg instanceof AIMessage);
    return aiMsg?.content?.toString() ?? null;
  }

  // --- Supervisor Endpoint ---
  @Post('supervisor') // Renamed from 'evaluate'
  async getSupervisorFeedback(
    @Body(ValidationPipe) body: EvaluateRequestDto,
  ): Promise<{ feedback: string | null }> {
    this.logger.log(`Supervisor endpoint called for question ${body.questionId}`);
    try {
      const feedbackContext = await this.fetchContext(body);
      const feedback = await this.langgraphFeedbackService.getSupervisorFeedback(feedbackContext);
      return { feedback };
    } catch (error) {
      this.logger.error(`Error in /supervisor for question ${body.questionId}:`, error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to generate supervisor feedback.');
    }
  }

  // --- Direct KC Endpoint ---
  @Post('kc')
  async getKcFeedback(
    @Body(ValidationPipe) body: EvaluateRequestDto,
  ): Promise<{ feedback: string | null }> { // Return string feedback for consistency?
     this.logger.log(`KC direct endpoint called for question ${body.questionId}`);
    try {
      const feedbackContext = await this.fetchContext(body);
      const feedbackMessages = await this.langgraphFeedbackService.getKcFeedback(feedbackContext);
      return { feedback: this.extractFeedbackContent(feedbackMessages) };
    } catch (error) {
      this.logger.error(`Error in /kc for question ${body.questionId}:`, error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to generate KC feedback.');
    }
  }

  // --- Direct KH Endpoint ---
  @Post('kh')
  async getKhFeedback(
    @Body(ValidationPipe) body: EvaluateRequestDto,
  ): Promise<{ feedback: string | null }> {
     this.logger.log(`KH direct endpoint called for question ${body.questionId}`);
     try {
      const feedbackContext = await this.fetchContext(body);
      const feedbackMessages = await this.langgraphFeedbackService.getKhFeedback(feedbackContext);
      return { feedback: this.extractFeedbackContent(feedbackMessages) };
    } catch (error) {
      this.logger.error(`Error in /kh for question ${body.questionId}:`, error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to generate KH feedback.');
    }
  }

  // --- Direct KM Endpoint ---
  @Post('km')
  async getKmFeedback(
    @Body(ValidationPipe) body: EvaluateRequestDto,
  ): Promise<{ feedback: string | null }> {
     this.logger.log(`KM direct endpoint called for question ${body.questionId}`);
     try {
      const feedbackContext = await this.fetchContext(body);
      const feedbackMessages = await this.langgraphFeedbackService.getKmFeedback(feedbackContext);
      return { feedback: this.extractFeedbackContent(feedbackMessages) };
    } catch (error) {
      this.logger.error(`Error in /km for question ${body.questionId}:`, error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to generate KM feedback.');
    }
  }

  // --- Direct KTC Endpoint ---
  @Post('ktc')
  async getKtcFeedback(
    @Body(ValidationPipe) body: EvaluateRequestDto,
  ): Promise<{ feedback: string | null }> {
     this.logger.log(`KTC direct endpoint called for question ${body.questionId}`);
     try {
      const feedbackContext = await this.fetchContext(body);
      const feedbackMessages = await this.langgraphFeedbackService.getKtcFeedback(feedbackContext);
      return { feedback: this.extractFeedbackContent(feedbackMessages) };
    } catch (error) {
      this.logger.error(`Error in /ktc for question ${body.questionId}:`, error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to generate KTC feedback.');
    }
  }
}

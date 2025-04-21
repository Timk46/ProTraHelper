import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Added PrismaService
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'; // Added for error handling
import { GraphBuilderService } from './graph/graph.builder.service';
import { TutoringFeedbackState } from './graph/state';
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/feedbackContext.dto';
import { FeedbackOutput } from './graph/schemas/feedback-output.schema';

@Injectable()
export class TutoringFeedbackService {
  private readonly logger = new Logger(TutoringFeedbackService.name);

  constructor(
    private graphBuilderService: GraphBuilderService,
    private prisma: PrismaService, // Injected PrismaService
  ) {}

  /**
   * Generates structured feedback for a given student submission context.
   * Orchestrates the execution of the underlying LangGraph workflow.
   * @param feedbackContext The input context containing student solution, task details, etc.
   * @returns An object containing the structured feedback JSON and the ID of the persisted feedback record.
   * @throws {InternalServerErrorException} If graph execution fails or returns an error state.
   * @throws {NotFoundException} If the final feedback JSON or the generatedFeedbackId is unexpectedly missing from the graph result.
   */
  async generateFeedback(
    feedbackContext: FeedbackContextDto,
  ): Promise<{ feedback: FeedbackOutput; feedbackId: string }> { // Updated return type
    this.logger.log(
      `Generating feedback for task (description length: ${feedbackContext.taskDescription?.length})`,
    );

    const compiledGraph = this.graphBuilderService.getCompiledGraph();

    // Prepare the initial state for the graph
    const initialState: Partial<TutoringFeedbackState> = {
      feedbackContext: feedbackContext,
    };

    try {
      // Invoke the graph workflow
      const finalState = await compiledGraph.invoke(initialState, {
         // Add config if needed, e.g., recursion limit
         // recursionLimit: 10,
      });

      this.logger.log('Graph execution completed.');

      // Check for errors during graph execution
      if (finalState.error) {
        this.logger.error(`Graph execution failed with error: ${finalState.error}`);
        throw new InternalServerErrorException(
          `Feedback generation failed internally: ${finalState.error}`,
        );
      }

      // Extract the final feedback
      const feedbackOutput = finalState.finalFeedbackJson;
      const feedbackId = finalState.generatedFeedbackId; // Extract the ID

      if (!feedbackOutput || !feedbackId) { // Check for both feedback and ID
        this.logger.error(
          'Final feedback JSON or generatedFeedbackId is missing from the graph final state.',
          `Feedback present: ${!!feedbackOutput}, ID present: ${!!feedbackId}`
        );
        throw new NotFoundException(
          'Failed to retrieve generated feedback content or its ID.',
        );
      }

      this.logger.log(`Successfully generated feedback JSON and retrieved ID: ${feedbackId}`);
      return { feedback: feedbackOutput, feedbackId: feedbackId }; // Return both
    } catch (error) {
      this.logger.error(`Error during graph invocation: ${error.message}`, error.stack);
      // Catch errors from invoke itself or errors thrown from our checks
       if (error instanceof InternalServerErrorException || error instanceof NotFoundException) {
         throw error; // Re-throw specific HTTP exceptions
       }
      throw new InternalServerErrorException(
        `An unexpected error occurred during feedback generation: ${error.message}`,
      );
    }
  }

  // --- Privacy Consent Methods ---

  /**
   * Retrieves the privacy consent status for a given user.
   * @param userId The ID of the user.
   * @returns A boolean indicating whether the user has accepted the privacy policy.
   * @throws {NotFoundException} If the user with the given ID is not found.
   * @throws {InternalServerErrorException} For other database errors.
   */
  async getPrivacyConsentStatus(userId: number): Promise<boolean> {
    this.logger.log(`Fetching privacy consent status for user ${userId}`);
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { hasAcceptedPrivacyPolicy: true },
      });
      return user.hasAcceptedPrivacyPolicy;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        this.logger.warn(`User ${userId} not found for privacy consent check.`);
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }
      this.logger.error(`Database error fetching privacy consent for user ${userId}:`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve privacy consent status.');
    }
  }

  /**
   * Marks the privacy policy as accepted for a given user.
   * @param userId The ID of the user.
   * @throws {NotFoundException} If the user with the given ID is not found.
   * @throws {InternalServerErrorException} For other database errors.
   */
  async acceptPrivacyPolicy(userId: number): Promise<void> {
    this.logger.log(`Setting privacy consent to true for user ${userId}`);
    try {
      const result = await this.prisma.user.updateMany({ // Use updateMany to avoid error if already true
        where: { id: userId },
        data: { hasAcceptedPrivacyPolicy: true },
      });

      if (result.count === 0) {
        // Check if the user actually exists, maybe they were deleted between check and update
        const userExists = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!userExists) {
          this.logger.warn(`User ${userId} not found when trying to accept privacy policy.`);
          throw new NotFoundException(`User with ID ${userId} not found.`);
        }
        // If user exists but count is 0, it means the value was already true. Log and proceed.
        this.logger.log(`Privacy policy was already accepted for user ${userId}.`);
      }

    } catch (error) {
       if (error instanceof NotFoundException) {
         throw error; // Re-throw specific exception
       }
      this.logger.error(`Database error accepting privacy policy for user ${userId}:`, error.stack);
      throw new InternalServerErrorException('Failed to update privacy consent status.');
    }
  }
}

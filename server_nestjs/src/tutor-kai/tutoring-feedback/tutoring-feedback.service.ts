import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { GraphBuilderService } from './graph/graph.builder.service';
import { TutoringFeedbackState } from './graph/state';
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/feedbackContext.dto';
import { FeedbackOutput } from './graph/schemas/feedback-output.schema';

@Injectable()
export class TutoringFeedbackService {
  private readonly logger = new Logger(TutoringFeedbackService.name);

  constructor(private graphBuilderService: GraphBuilderService) {}

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
}

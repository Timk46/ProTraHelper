import { Injectable, Logger } from '@nestjs/common';
import { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages'; // Added HumanMessage
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/feedbackContext.dto';

// Import Providers
import { KcAgentProvider } from './agents/kc/kc.provider';
import { KhAgentProvider } from './agents/kh/kh.provider';
import { KmAgentProvider } from './agents/km/km.provider';
import { KtcAgentProvider } from './agents/ktc/ktc.provider';
import { SupervisorWorkflowService } from './agents/supervisor/supervisor.workflow';

/**
 * Facade Service to interact with feedback agents and the supervisor workflow.
 * It delegates the actual logic to the respective providers or workflow service.
 */
@Injectable()
export class LanggraphFeedbackService {
  private readonly logger = new Logger(LanggraphFeedbackService.name);

  constructor(
    private readonly supervisorWorkflowService: SupervisorWorkflowService,
    private readonly kcAgentProvider: KcAgentProvider,
    private readonly khAgentProvider: KhAgentProvider,
    private readonly kmAgentProvider: KmAgentProvider,
    private readonly ktcAgentProvider: KtcAgentProvider,
  ) {}

  /**
   * Gets feedback by running the supervisor workflow.
   * @param contextInput The feedback context.
   * @returns The final feedback string or null.
   */
  async getSupervisorFeedback(contextInput: FeedbackContextDto): Promise<string | null> {
    this.logger.log(`Getting supervisor feedback for attempt ${contextInput.attemptCount}`);
    try {
      // Invoke the workflow service
      const finalState = await this.supervisorWorkflowService.invokeWorkflow(contextInput);

      // Extract the final feedback message (similar logic as before)
      let feedback: string | null = null;
      if (finalState && Array.isArray(finalState.messages)) {
        for (let i = finalState.messages.length - 1; i >= 0; i--) {
          const msg = finalState.messages[i];
          if (msg instanceof AIMessage && typeof msg.content === 'string') {
            const content = msg.content.trim();
            if (!content.startsWith('{"routingDecision":')) {
              // Avoid internal router messages
              feedback = content;
              // Optional: Strip reasoning, quotes etc. (add logic if needed)
              break;
            }
          }
        }
      }
      this.logger.log(
        `Supervisor feedback generated: ${feedback ? feedback.substring(0, 100) + '...' : 'None'}`,
      );
      return feedback;
    } catch (error) {
      this.logger.error('Error getting supervisor feedback:', error);
      throw error; // Re-throw or handle appropriately
    }
  }

  /**
   * Gets feedback directly from the KC agent.
   * @param contextInput The feedback context.
   * @returns An array of AI messages from the agent or null.
   */
  async getKcFeedback(contextInput: FeedbackContextDto): Promise<BaseMessage[] | null> {
    this.logger.log(`Getting direct KC feedback for attempt ${contextInput.attemptCount}`);
    try {
      const agentRunnable = this.kcAgentProvider.getAgentRunnable(); // Updated method call

      // Input formatting is removed as the agent now accepts the DTO directly.
      // Prepare the input object expected by the refactored KC agent runnable.
      // We pass an empty message array as the initial history.
      const agentInput = {
        messages: [], // Start with empty message history for direct call
        context: contextInput, // Pass the DTO directly
      };

      const result = await agentRunnable.invoke(agentInput); // Pass direct DTO and empty messages
      // Assuming the result structure contains 'messages'
      const aiMessages = result?.messages?.filter(msg => msg instanceof AIMessage) ?? null;
      this.logger.log(
        `Direct KC feedback generated: ${aiMessages ? aiMessages.length + ' messages' : 'None'}`,
      );
      return aiMessages;
    } catch (error) {
      this.logger.error('Error getting direct KC feedback:', error);
      throw error;
    }
  }

  /**
   * Gets feedback directly from the KH agent.
   * @param contextInput The feedback context.
   * @returns An array of AI messages from the agent or null.
   */
  async getKhFeedback(contextInput: FeedbackContextDto): Promise<BaseMessage[] | null> {
    this.logger.log(`Getting direct KH feedback for attempt ${contextInput.attemptCount}`);
    try {
      const agentChain = this.khAgentProvider.getAgentChain();
      const result = await agentChain.invoke(contextInput);
      const aiMessages = result?.messages?.filter(msg => msg instanceof AIMessage) ?? null;
      this.logger.log(
        `Direct KH feedback generated: ${aiMessages ? aiMessages.length + ' messages' : 'None'}`,
      );
      return aiMessages;
    } catch (error) {
      this.logger.error('Error getting direct KH feedback:', error);
      throw error;
    }
  }

  /**
   * Gets feedback directly from the KM agent.
   * @param contextInput The feedback context.
   * @returns An array of AI messages from the agent or null.
   */
  async getKmFeedback(contextInput: FeedbackContextDto): Promise<BaseMessage[] | null> {
    this.logger.log(`Getting direct KM feedback for attempt ${contextInput.attemptCount}`);
    try {
      const agentChain = this.kmAgentProvider.getAgentChain();
      const result = await agentChain.invoke(contextInput);
      const aiMessages = result?.messages?.filter(msg => msg instanceof AIMessage) ?? null;
      this.logger.log(
        `Direct KM feedback generated: ${aiMessages ? aiMessages.length + ' messages' : 'None'}`,
      );
      return aiMessages;
    } catch (error) {
      this.logger.error('Error getting direct KM feedback:', error);
      throw error;
    }
  }

  /**
   * Gets feedback directly from the KTC agent.
   * @param contextInput The feedback context.
   * @returns An array of AI messages from the agent or null.
   */
  async getKtcFeedback(contextInput: FeedbackContextDto): Promise<BaseMessage[] | null> {
    this.logger.log(`Getting direct KTC feedback for attempt ${contextInput.attemptCount}`);
    try {
      const agentChain = this.ktcAgentProvider.getAgentChain();
      const result = await agentChain.invoke(contextInput);
      const aiMessages = result?.messages?.filter(msg => msg instanceof AIMessage) ?? null;
      this.logger.log(
        `Direct KTC feedback generated: ${aiMessages ? aiMessages.length + ' messages' : 'None'}`,
      );
      return aiMessages;
    } catch (error) {
      this.logger.error('Error getting direct KTC feedback:', error);
      throw error;
    }
  }
}

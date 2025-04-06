import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai'; // Assuming OpenAI, adjust if different
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { TutoringFeedbackState } from '../state';

@Injectable()
export class GenerateFixedCodeNodeService {
  private readonly logger = new Logger(GenerateFixedCodeNodeService.name);
  private llm: ChatOpenAI; // We'll configure this properly later via LlmProviderService

  constructor(private configService: ConfigService) {
    // Basic LLM initialization - replace with proper injection/configuration
    this.llm = new ChatOpenAI({
      modelName: 'o3-mini',
    });
  }

  /**
   * Executes the node's logic: generates a fixed version of the student's code.
   * @param state The current LangGraph state.
   * @returns A partial state object containing the generated fixedCode.
   */
  async execute(
    state: TutoringFeedbackState,
  ): Promise<Partial<TutoringFeedbackState>> {
    this.logger.log('Executing GenerateFixedCode Node');
    const { feedbackContext } = state;

    if (!feedbackContext) {
      this.logger.error('FeedbackContext is missing from state.');
      return { error: 'FeedbackContext is missing in GenerateFixedCodeNode.' };
    }

    const { studentSolution, taskDescription, automatedTests } = feedbackContext; // Extract automatedTests

    const systemPrompt = `You are an expert programming tutor. Your task is to analyze the provided student code for a given programming task and generate a corrected version.
Focus on fixing errors and making the code functional according to the task description AND ensuring it passes the provided automated tests, while preserving the student's original logic and approach as much as possible.
The corrected code MUST pass the automated tests.
Do NOT simply provide the model solution. Generate only the corrected code, without any explanations, comments, or introductory phrases.`;

    let userPrompt = `Task Description:\n\`\`\`\n${taskDescription}\n\`\`\`\n\nStudent Solution:\n\`\`\`\n${studentSolution}\n\`\`\``;

    if (automatedTests) {
      // Simple stringification, might need refinement based on actual structure
      userPrompt += `\n\nAutomated Tests (the corrected code MUST pass these):\n\`\`\`\n${JSON.stringify(
        automatedTests,
        null,
        2,
      )}\n\`\`\``;
    }

    userPrompt += `\n\nGenerate the corrected code that passes the automated tests:`;

    try {
      // TODO: Implement retry logic (e.g., using tenacity or a simple loop)
      const response = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      const fixedCode = response.content.toString().trim();
      this.logger.log('Successfully generated fixed code.');
      return { fixedCode: fixedCode };
    } catch (error) {
      this.logger.error(`Error generating fixed code: ${error.message}`, error.stack);
      // TODO: Implement more robust error handling / retry logic
      return { error: `Failed to generate fixed code: ${error.message}` };
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai'; // Assuming OpenAI, adjust if different
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { TutoringFeedbackState } from '../state';

@Injectable()
export class GenerateFixedCodeNodeService {
  private readonly logger = new Logger(GenerateFixedCodeNodeService.name);
  private readonly llm: ChatOpenAI; // We'll configure this properly later via LlmProviderService

  constructor(private readonly configService: ConfigService) {
    // Basic LLM initialization - replace with proper injection/configuration
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4.1-2025-04-14',
      temperature: 0,
    });
  }

  /**
   * Executes the node's logic: generates a fixed version of the student's code.
   * @param state The current LangGraph state.
   * @returns A partial state object containing the generated fixedCode.
   */
  async execute(state: TutoringFeedbackState): Promise<Partial<TutoringFeedbackState>> {
    this.logger.log('Executing GenerateFixedCode Node');
    const { feedbackContext } = state;

    if (!feedbackContext) {
      this.logger.error('FeedbackContext is missing from state.');
      return { error: 'FeedbackContext is missing in GenerateFixedCodeNode.' };
    }

    const { studentSolution, taskDescription, automatedTests } = feedbackContext; // Extract automatedTests

    const systemPrompt = `
# Role and Objective
You are an expert programming tutor AI. Your primary objective is to analyze the provided student code against a task description and automated tests, then generate a corrected version of the code.

# Instructions
Analyze the provided 'Student Solution' for the given 'Task Description'. Identify and correct any errors that prevent the code from:
1.  Being functionally correct according to the 'Task Description'.
2.  Passing all provided 'Automated Tests'.

# Key Constraints & Rules
1.  **MUST Pass Tests:** The absolute highest priority is that the corrected code MUST pass 100% of the provided 'Automated Tests'. All other constraints are secondary to this.
2.  **Preserve Original Logic:** Wherever possible *without compromising test passing or functionality*, preserve the student's original algorithmic approach, variable names, function structures, and overall coding style. Make minimal changes required to achieve correctness and pass tests. If a fundamental change to the student's logic is *required* to pass the tests, prioritize passing the tests.
3.  **Functionality:** Ensure the corrected code accurately implements the requirements specified in the 'Task Description'.
4.  **No New Dependencies:** Do not introduce new libraries or external dependencies unless absolutely necessary for the correction and clearly implied by the task or tests.

# Output Format Requirements
1.  **Code ONLY:** You MUST output *only* the complete, corrected code block.
2.  **NO Explanations:** Do NOT include *any* text before or after the code block. No introductory phrases ("Here is the corrected code:"), no concluding remarks, no summaries of changes.
3.  **NO Comments About Changes:** Do NOT add comments to the code explaining *why* changes were made. Only include comments if they are essential for the code's functionality or were part of the original student code (and remain relevant).

# Context
## Task Description:
${taskDescription}

## Student Solution:
${studentSolution}

## Automated Tests (the corrected code MUST pass these)
### Unit Test Definitions
${feedbackContext.automatedTests ? feedbackContext.automatedTests[0].code : 'None provided.'}

### Unit Test Results (for Student Solution)
${
  feedbackContext.unitTestResults
    ? JSON.stringify(feedbackContext.unitTestResults)
    : 'None provided.'
}

# Final instructions
Generate the corrected code that passes the automated tests.
`;

    try {
      // TODO: Implement retry logic (e.g., using tenacity or a simple loop)
      const response = await this.llm.invoke([new SystemMessage(systemPrompt)]);

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

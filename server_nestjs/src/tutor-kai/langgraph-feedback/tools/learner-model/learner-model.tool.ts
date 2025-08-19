import { DynamicStructuredTool } from '@langchain/core/tools';
import { LearnerModelToolService } from './learner-model.service';
import { z } from 'zod';
import { Logger } from '@nestjs/common'; // Import Logger

// Define the schema for the tool's input using Zod
const LearnerModelToolSchema = z.object({
  userId: z.number().int().positive().describe('The unique identifier for the student.'),
  codingQuestionId: z
    .number()
    .int()
    .positive()
    .describe('The unique identifier for the specific coding question.'),
  conceptNodeId: z
    .number()
    .int()
    .positive()
    .nullable() // Concept ID can be null if not applicable/available
    .describe(
      'The unique identifier for the primary concept associated with the coding question (if available).',
    ),
});

// Type for the input based on the Zod schema
type LearnerModelToolInput = z.infer<typeof LearnerModelToolSchema>;

/**
 * Creates an instance of the Learner Model Tool.
 * This tool fetches aggregated performance data, history, and summaries for a student
 * related to a specific coding question and concept.
 *
 * @param learnerModelToolService An instance of the LearnerModelToolService.
 * @returns A DynamicStructuredTool instance.
 */
export function createLearnerModelTool(
  learnerModelToolService: LearnerModelToolService,
): DynamicStructuredTool {
  const logger = new Logger('LearnerModelTool'); // Instantiate logger for the tool function

  return new DynamicStructuredTool({
    name: 'fetch_learner_model',
    description: `Fetches historical performance data and a summary for a specific student on a particular coding question and its associated concept. Use this tool when you need context beyond the current code submission, such as understanding past struggles, performance on related concepts, or overall progress, to make a more informed pedagogical decision. Provides data like overall performance, performance on prerequisites, and a summary of attempts on the current task.`,
    schema: LearnerModelToolSchema,
    func: async (
      input: LearnerModelToolInput,
      runManager?, // Optional runManager from Langchain callbacks
    ): Promise<string> => {
      logger.log(`Executing fetch_learner_model tool with input: ${JSON.stringify(input)}`);
      try {
        // Input is already parsed and validated by LangChain via the schema
        const { userId, codingQuestionId, conceptNodeId } = input;

        // Call the service method
        const learnerModelData = await learnerModelToolService.getLearnerModelData(
          userId,
          codingQuestionId,
          conceptNodeId,
        );

        // Return the data as a JSON string for the agent
        const resultString = JSON.stringify(learnerModelData);
        logger.log(`fetch_learner_model tool result length: ${resultString.length}`);
        // Consider truncating if the result string can be excessively long
        // if (resultString.length > 3000) { // Example threshold
        //    logger.warn(`fetch_learner_model result truncated due to length.`);
        //    return resultString.substring(0, 3000) + '... [TRUNCATED]';
        // }
        return resultString;
      } catch (error) {
        logger.error(
          `Error executing fetch_learner_model tool with input: ${JSON.stringify(input)}`,
          error,
        );
        // Return a structured error message
        return JSON.stringify({
          error: `Failed to fetch learner model data: ${error.message || 'Unknown error'}`,
        });
      }
    },
  });
}

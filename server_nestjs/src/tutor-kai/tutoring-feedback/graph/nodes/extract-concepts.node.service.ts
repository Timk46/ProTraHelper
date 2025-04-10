import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai'; // Assuming OpenAI, adjust if different
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { TutoringFeedbackState } from '../state';
import { ConceptExtractionSchema } from '../schemas/concept-extraction.schema';

@Injectable()
export class ExtractConceptsNodeService {
  private readonly logger = new Logger(ExtractConceptsNodeService.name);
  private llm: ChatOpenAI; // We'll configure this properly later via LlmProviderService

  constructor(private configService: ConfigService) {
    // Basic LLM initialization - replace with proper injection/configuration
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0,
    });
  }

  /**
   * Executes the node's logic: extracts relevant programming concepts.
   * @param state The current LangGraph state.
   * @returns A partial state object containing the extracted concepts array.
   */
  async execute(
    state: TutoringFeedbackState,
  ): Promise<Partial<TutoringFeedbackState>> {
    this.logger.log('Executing ExtractConcepts Node');
    const { feedbackContext } = state;

    if (!feedbackContext) {
      this.logger.error('FeedbackContext is missing from state.');
      return { error: 'FeedbackContext is missing in ExtractConceptsNode.' };
    }

    const { studentSolution, taskDescription, compilerOutput, unitTestResults } =
      feedbackContext;

    // Prepare context string for the prompt
    let contextString = `Task Description:\n\`\`\`\n${taskDescription}\n\`\`\`\n\nStudent Solution:\n\`\`\`\n${studentSolution}\n\`\`\``;
    if (compilerOutput) {
      contextString += `\n\nCompiler Output:\n\`\`\`\n${compilerOutput}\n\`\`\``;
    }
    if (unitTestResults) {
      // Simple stringification, might need refinement based on actual structure
      contextString += `\n\nUnit Test Results:\n\`\`\`\n${JSON.stringify(
        unitTestResults,
        null,
        2,
      )}\n\`\`\``;
    }

    const systemPrompt = `You are an expert programming tutor analyzing student work. Your task is to identify the 1 most relevant programming concept related to the provided task description, student solution, and any errors (compiler output).
Focus on core programming concepts (e.g., recursion, loops, data types, conditional statements, object-oriented principles, specific algorithms/data structures if applicable) that are central to the task or where the student might be struggling.
Return ONLY the names of the concepts in the specified JSON format.`;

    const userPrompt = `Based on the following context, identify the 1 most relevant programming concept:

${contextString}`;

    const llmWithStructure = this.llm.withStructuredOutput(
      ConceptExtractionSchema,
      { name: 'extract_concepts' }, // Name for the structured output "tool"
    );

    try {
      // TODO: Implement retry logic
      const response = await llmWithStructure.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      this.logger.log(`Successfully extracted concepts: ${response.concepts?.join(', ')}`);
      return { concepts: response.concepts ?? [] }; // Ensure it's always an array
    } catch (error) {
      this.logger.error(`Error extracting concepts: ${error.message}`, error.stack);
      // TODO: Implement more robust error handling / retry logic
      return { error: `Failed to extract concepts: ${error.message}` };
    }
  }
}

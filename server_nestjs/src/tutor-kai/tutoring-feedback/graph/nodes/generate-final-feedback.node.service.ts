import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai'; // Assuming OpenAI, adjust if different
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { TutoringFeedbackState } from '../state';
import { FeedbackOutputSchema } from '../../dtos/feedback-output.schema';

@Injectable()
export class GenerateFinalFeedbackNodeService {
  private readonly logger = new Logger(GenerateFinalFeedbackNodeService.name);
  private llm: ChatOpenAI; // We'll configure this properly later via LlmProviderService

  constructor(private configService: ConfigService) {
    // Basic LLM initialization - replace with proper injection/configuration
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4.5',
      temperature: 0,
    });
  }

  /**
   * Executes the node's logic: generates the final structured feedback JSON.
   * @param state The current LangGraph state.
   * @returns A partial state object containing the finalFeedbackJson.
   */
  async execute(
    state: TutoringFeedbackState,
  ): Promise<Partial<TutoringFeedbackState>> {
    this.logger.log('Executing GenerateFinalFeedback Node');
    const { feedbackContext, fixedCode, lectureSnippets, sourceMap } = state; // Add sourceMap

    if (!feedbackContext) {
      this.logger.error('FeedbackContext is missing from state.');
      return { error: 'FeedbackContext is missing in GenerateFinalFeedbackNode.' };
    }
    // Fixed code and snippets might be null/empty, but we proceed anyway, letting the LLM handle missing info
    if (!fixedCode) {
        this.logger.warn('Fixed code is missing from state. Proceeding without it.');
    }
     // lectureSnippets is now a string, check if it's the default empty array string '[]' or null/undefined
     if (!lectureSnippets || lectureSnippets === '[]') {
        this.logger.warn('Lecture snippets JSON string is missing or empty. Proceeding without them.');
    }


    // Construct the prompt, incorporating guidelines from FeedbackGuide.md
    const systemPrompt = `You are an expert, empathetic programming tutor providing feedback to a computer science student.
Your goal is to generate comprehensive, pedagogically sound feedback based on the provided context.
Adhere STRICTLY to the requested JSON output format with the following keys: IT, KCR, KM, KTC, KC, KH.

Guidelines:
- IT (Internal Thoughts): Provide a brief, hidden chain-of-thought outlining your pedagogical reasoning for the feedback structure and content.
- KCR (Knowledge about Correct Results): Explain the correct approach or a possible correct solution. Include clear, step-by-step instructions (in the 'steps' array) on how to achieve it. Reference the 'fixedCode' provided as one possible correct implementation, but acknowledge other valid approaches might exist.
- KM (Knowledge about Mistakes): Clearly identify the errors in the 'studentSolution' based on the 'taskDescription', 'compilerOutput', and 'unitTestResults'. Explain the nature and potential cause of these mistakes.
- KTC (Knowledge about Task Constraints): Highlight any specific task requirements, rules, or constraints from the 'taskDescription' that the student might have missed or violated.
- KC (Knowledge about Concepts): Explain the core programming concepts relevant to the task and the student's mistakes. IMPORTANT: If 'lectureSnippets' are provided (as a JSON string in the context below), you MUST cite information from them to support your explanations using the placeholder format \`$$\$Zahl\$\$\` exactly as provided in the 'Quelle' field within the snippets JSON. Do NOT attempt to create markdown links yourself. If no relevant snippets are available for a concept, explain it generally.
- KH (Knowledge about How to Proceed): Offer actionable advice, hints, and next steps for the student to improve their solution or understanding. Guide them towards correcting their mistakes.

Context Provided:
- Task Description
- Student's Submitted Solution
- Compiler Output (if any)
- Unit Test Results (if any)
- A Corrected Version of the Student's Code ('fixedCode') (if available)
- Relevant Lecture Snippets (if available)

Generate the feedback JSON object.`;

    // Prepare context string for the user prompt
    let contextString = `Task Description:\n\`\`\`\n${feedbackContext.taskDescription}\n\`\`\`\n\nStudent Solution:\n\`\`\`\n${feedbackContext.studentSolution}\n\`\`\``;
    if (feedbackContext.compilerOutput) {
      contextString += `\n\nCompiler Output:\n\`\`\`\n${feedbackContext.compilerOutput}\n\`\`\``;
    }
    // Use automatedTests instead of unitTestResults if that's the correct DTO field
    if (feedbackContext.automatedTests) {
      contextString += `\n\nAutomated Tests:\n\`\`\`\n${JSON.stringify(feedbackContext.automatedTests, null, 2)}\n\`\`\``;
    } else if (feedbackContext.unitTestResults) { // Fallback if unitTestResults is used
       contextString += `\n\nUnit Test Results:\n\`\`\`\n${JSON.stringify(feedbackContext.unitTestResults, null, 2)}\n\`\`\``;
    }
     if (fixedCode) {
      contextString += `\n\nCorrected Code Version (for reference):\n\`\`\`\n${fixedCode}\n\`\`\``;
    }
    // Pass the lectureSnippets JSON string directly
    if (lectureSnippets && lectureSnippets !== '[]') {
      contextString += `\n\nRelevant Lecture Snippets (JSON format):\n\`\`\`json\n${lectureSnippets}\n\`\`\``;
    } else {
         contextString += `\n\nRelevant Lecture Snippets: None available.`;
    }


    const userPrompt = `Generate the structured feedback JSON based on the following context:

${contextString}`;

    const llmWithStructure = this.llm.withStructuredOutput(
      FeedbackOutputSchema,
      { name: 'generate_final_feedback' },
    );

    try {
      // TODO: Implement retry logic
      const response = await llmWithStructure.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      this.logger.log('Successfully generated final structured feedback.');
      this.logger.log('Successfully generated raw feedback from LLM.');

      // Process citations in the KC field
      let processedFeedback = response; // Start with the raw response
      if (processedFeedback.KC && sourceMap && Object.keys(sourceMap).length > 0) {
        this.logger.log('Processing citations in KC field...');
        processedFeedback.KC = processedFeedback.KC.replace(
          /\$\$([0-9]+)\$\$/g,
          (match, numberStr) => {
            const link = sourceMap[numberStr];
            if (link) {
              // Return markdown link format
              return `[Quelle ${numberStr}](${link})`;
            } else {
              this.logger.warn(`No link found in sourceMap for $$${numberStr}$$`);
              return match; // Keep original placeholder if no link found
            }
          },
        );
        this.logger.log('Citation processing complete.');
      } else {
         this.logger.log('No citations to process or sourceMap missing.');
      }


      return { finalFeedbackJson: processedFeedback };
    } catch (error) {
      this.logger.error(
        `Error generating final feedback: ${error.message}`,
        error.stack,
      );
      // TODO: Implement more robust error handling / retry logic
      return { error: `Failed to generate final feedback: ${error.message}` };
    }
  }
}

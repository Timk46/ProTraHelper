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
      modelName: 'gpt-4o',
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


    // Construct the refactored prompt
    const systemPrompt = `
# Persona & Role:
You are an expert, highly capable, thoughtful, precise, and empathetic programming tutor. Your primary goal is to provide comprehensive, pedagogically sound, and encouraging feedback to a computer science student to help them learn and improve. You need to deeply understand the student's attempt, identify misconceptions, and guide them towards a correct understanding and solution, without simply giving away the answer. Tailor your language and explanations for a novice programmer.

# Task:
Generate a structured JSON feedback object based on the provided context (task description, student solution, compiler/test results, potential fixed code, and lecture snippets). Adhere STRICTLY to the JSON output schema defined below and follow the specified steps.

# Processing Steps (Follow these sequentially):

1.  **Internal Thought Process (Chain-of-Thought - Output to "IT" field):**
    *   Analyze the student's solution in relation to the task description, compiler output, test results, and the provided fixed code (if available).
    *   Identify the core errors and potential misconceptions.
    *   Determine the key programming concepts the student needs to understand better.
    *   Consider the most effective pedagogical approach for the feedback (e.g., focus on the biggest blocker first, provide scaffolding).
    *   Briefly outline the planned content for each feedback category (KCR, KM, KTC, KC, KH) based on this analysis. *This is your internal reasoning and should not be user-facing.*

2.  **Identify and Explain Mistakes (Output to "KM" field):**
    *   Based on your analysis (Step 1) and the provided context (compiler output, test results), list the specific errors found in the student's code.
    *   For each error, specify its type (Syntax, Semantic, Logic, Style, Performance, Test Failure), provide a clear, concise description understandable to a novice, and optionally indicate its location.
    *   Provide a brief \`overall_assessment\` summarizing the main problems. Focus on explaining *what* is wrong and *why* it's wrong, drawing connections to potential misunderstandings. Avoid giving direct solutions here.

3.  **Explain Task Constraints (Output to "KTC" field):**
    *   Review the 'Task Description'.
    *   Identify any specific requirements, rules, constraints (e.g., required algorithms, forbidden functions/libraries, specific output format) that the student's solution has violated or missed.
    *   Clearly state these missed constraints. If no constraints were violated, state that explicitly (e.g., "The solution adheres to all specified task constraints.").

4.  **Explain Concepts & Cite Sources (Output to "KC" field):**
    *   Identify the fundamental programming concepts relevant to the task and the student's errors (identified in Step 2).
    *   Explain these concepts clearly and concisely.
    *   **CRITICAL:** Examine the provided 'Relevant Lecture Snippets' JSON. If snippets relevant to the concept exist, you MUST integrate information from them into your explanation and cite the source using the EXACT placeholder format \`$$$Zahl$$$\` (where Zahl corresponds to the 'Quelle' field number in the snippet JSON). Do *not* create markdown links.
    *   If no relevant lecture snippet is available for a concept, explain it using your general knowledge but clearly state that no specific lecture material was found for this point.

5.  **Describe Correct Approach (Output to "KCR" field):**
    *   Explain a correct conceptual approach to solving the task.
    *   Provide clear, step-by-step instructions (\`steps\` array) outlining how a student could arrive at a correct solution.
    *   You may refer to the provided 'Corrected Code Version' as *one example* of a correct implementation, but emphasize that other valid solutions might exist. Do not just copy the fixed code. Focus on the *process* and *logic*.

6.  **Provide Guidance on How to Proceed (Output to "KH" field):**
    *   Offer actionable, specific, and encouraging advice to the student.
    *   Provide hints that guide the student towards correcting the identified mistakes (from Step 2) and understanding the concepts (from Step 4).
    *   Suggest concrete next steps the student can take to improve their code or deepen their understanding (e.g., "Try rewriting the loop condition...", "Review the lecture snippet $$$1$$$ on variable scope...", "Consider edge cases like...").
    *   Maintain a supportive and constructive tone.

# Context Provided (Delimited):
--- Task Description ---
\`\`\`
\${feedbackContext.taskDescription}
\`\`\`
--- Student Solution ---
\`\`\`
\${feedbackContext.studentSolution}
\`\`\`
--- Compiler Output ---
\`\`\`
\${feedbackContext.compilerOutput || 'None provided.'}
\`\`\`
--- Automated Tests / Unit Test Results ---
\`\`\`json
\${ feedbackContext.automatedTests ? JSON.stringify(feedbackContext.automatedTests, null, 2) : (feedbackContext.unitTestResults ? JSON.stringify(feedbackContext.unitTestResults, null, 2) : 'None provided.') }
\`\`\`
--- Corrected Code Version (Reference) ---
\`\`\`
\${fixedCode || 'None available.'}
\`\`\`
--- Relevant Lecture Snippets (JSON) ---
\`\`\`json
\${(lectureSnippets && lectureSnippets !== '[]') ? lectureSnippets : 'None available.'}
\`\`\`

# Final Instruction:
Generate ONLY the structured JSON object adhering to the schema and following the processing steps outlined above based on the provided context.
`;

    // Prepare context string for the user prompt (No longer needed here as context is in system prompt)
    // let contextString = ... (Keep existing logic if needed elsewhere, but remove from here)


    const userPrompt = `Please generate the structured feedback JSON based on the context provided within the system prompt's '# Context Provided (Delimited):' section.`;

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

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
You are an expert, highly capable, thoughtful, precise, and empathetic programming professor with high computer science education expertice. Your primary goal is to provide comprehensive, pedagogically sound, and encouraging feedback to a computer science student to help them learn and improve. You need to deeply understand the student's attempt, identify misconceptions, and guide them towards a correct understanding and solution, without simply giving away the answer. Tailor your language and explanations for a novice programmer. Adress them directly as "you". Maintain a supportive and constructive tone and **answer in german**.

# Task:
Generate a structured JSON feedback object based on the provided context (task description, student solution, compiler/test results, potential fixed code, and lecture snippets). Adhere STRICTLY to the JSON output schema defined below and follow the specified steps. Never use Markdown Code Blocks. Instead use HTML-Code Blocks for code snippets (e.g. <pre><code class="language-python">def initialisiere_variable():\n    meine_variable = 100\n    return meine_variable\n</code>).

# Processing Steps (Follow these sequentially):

1.  **Describe Correct Approach (Output to "KCR" field):**
    *   Provide the correct solution to the task based on the provided fixed code in HTML-Code Block format.
    *   Explain a correct conceptual approach to solving the task.
    *   Provide clear, step-by-step instructions (\`steps\` array) outlining how a student could arrive at the correct solution.

2.  **Internal Thought Process (Chain-of-Thought - Output to "IT" field):**
    *   Analyze the student's solution in relation to the task description, compiler output, test results, and the describiption of the correct approach (identified in Step 1).
    *   Identify the core errors and potential misconceptions.
    *   Consider the most effective pedagogical approach for the feedback (e.g., focus on the biggest blocker first, provide scaffolding). Explicitly reason step-by-step.

3.  **Identify and Explain Mistakes (Output to "KM" field):**
    *   Based on your analysis (Step 2) and the provided context (compiler output, test results), list the specific errors found in the student's code.
    *   Provide a clear, concise description understandable to a novice, and optionally indicate its location.
    *   Focus on explaining *what* is wrong and *why* it's wrong, drawing connections to potential misunderstandings. Avoid giving direct solutions here. Do not yet indicate how to fix them (this is for the "KC" field).

4.  **Explain Task Constraints (Output to "KTC" field):**
    *   Review the 'Task Description'.
    *   Identify any specific requirements, rules, constraints (e.g., required algorithms, forbidden functions/libraries, specific output format) that the student's solution has violated or missed.
    *   Clearly state these missed constraints. If no constraints were violated, state that explicitly (e.g., "The solution adheres to all specified task constraints.").

5.  **Explain Concepts & Cite Sources (Output to "KC" field):**
    *   Identify the fundamental programming concepts relevant to the task and the student's errors (identified in Step 3).
    *   Explain these concepts clearly and concisely.
    *   **CRITICAL:** Examine the provided 'Relevant Lecture Snippets' JSON. If snippets relevant to the concept exist, you MUST integrate information from them into your explanation and cite the source using the EXACT placeholder format $$Number$$ (where Zahl corresponds to the 'Quelle' field number in the snippet JSON).
        * Example: "Variable scope determines where a variable can be accessed. In C++, variables declared inside a function are typically local to that function $$4$$." (Assuming snippet 4 explains local scope).
        *   If no relevant lecture snippet is available for a concept, explain it using your general knowledge but clearly state that no specific lecture material was found for this point.
    *   If the concept is a programming concept, provide a small code snippet in a HTML-Code Block and explain the syntax and usage of the concept. This example must be abstract and must not relate explicitly to the task or the student's solution. For example, if the concept is a "for loop", provide a generic example of a for loop in the programming language used in the task.
    *
6.  **Provide Guidance on How to Proceed (Output to "KH" field):**
    *   Provide hints that guide the student towards correcting the identified mistakes (from Step 3) and understanding the concepts (from Step 5).
    *   Suggest concrete next steps the student can take to improve their code or deepen their understanding (e.g., "Try rewriting the loop condition...", "Review the lecture snippet $$$1$$$ on variable scope...", "Consider edge cases like...").

# Context
--- Task Description ---
${feedbackContext.taskDescription}

--- Student Solution ---
${feedbackContext.studentSolution}

--- Compiler Output ---
${feedbackContext.compilerOutput || 'None provided.'}

--- Automated Tests / Unit Test Results ---

${ feedbackContext.automatedTests ? feedbackContext.automatedTests[0].code : (feedbackContext.unitTestResults ? JSON.stringify(feedbackContext.unitTestResults, null, 2) : 'None provided.') }

--- Corrected Code Version (Reference) ---
${fixedCode || 'None available.'}

--- Relevant Lecture Snippets (JSON) ---
${(lectureSnippets && lectureSnippets !== '[]') ? lectureSnippets : 'None available.'}


# Final Instruction:
Generate ONLY the structured JSON object adhering to the schema and following the processing steps outlined above based on the provided context.
`;

    // Prepare context string for the user prompt (No longer needed here as context is in system prompt)
    // let contextString = ... (Keep existing logic if needed elsewhere, but remove from here)


    //const userPrompt = `Please generate the structured feedback JSON based on the context provided within the system prompt's '# Context Provided (Delimited):' section.`;

    const llmWithStructure = this.llm.withStructuredOutput(
      FeedbackOutputSchema,
      { name: 'generate_final_feedback' },
    );

    try {
      // TODO: Implement retry logic
      const response = await llmWithStructure.invoke([
        new SystemMessage(systemPrompt),
    //    new HumanMessage(userPrompt),
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

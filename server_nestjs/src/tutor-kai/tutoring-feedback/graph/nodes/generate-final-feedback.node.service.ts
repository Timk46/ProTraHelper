import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai'; // Assuming OpenAI, adjust if different
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { TutoringFeedbackState } from '../state';
import { FeedbackOutputSchema } from '../schemas/feedback-output.schema';

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
*   You are an empathetic programming professor with high computer science education expertice.
*   Your primary goal is to provide comprehensive, pedagogically sound, and encouraging feedback to a computer science student to help them learn and improve.
*   You need to deeply understand the student's attempt, identify misconceptions, and guide them towards a correct understanding and solution, without simply giving away the answer.

# Tone & Language:
*   Speak as if you were a patient and friendly tutor helping a student. Address the student informal as "Du" (you) instead of third person (e.g. "Der Student"). For Example: "Du hast" instead of "Der Student hat".
*   Use simple, beginner-friendly language that is easy to understand, especially for someone new to programming.
*   Respond in German.

# Task:
*   Generate a structured JSON feedback object based on the provided context (task description, student solution, compiler/test results, potential fixed code, and lecture snippets).
*   Adhere STRICTLY to the JSON output schema defined below and follow the specified steps based on your persona and using the specified tone.
*   Format your answer with markdown and ensure it is clear and easy to read. **Never use Markdown Code Blocks** Instead use HTML-Code Blocks for code snippets (e.g. <pre><code class="language-python">def initialisiere_variable():\n    meine_variable = 100\n    return meine_variable\n</code>).

# Processing Steps (Follow these sequentially):

1.  **Provide Strategic Processing Steps (Output to "SPS" field):**
    *   Provide information about the **systematic, strategic approach** to solving this *type* of task and similar tasks. Focus on the **generalizable process or method**.
    *   This may include:
        *   Identifying the *category* of the problem (e.g., iteration over a collection, recursive base cases/steps, input validation, searching/sorting).
        *   Suggesting standard *algorithms, design patterns, or common programming idioms* suitable for this category (e.g., "For iterating through all elements, a for-each loop is often suitable," "Recursive solutions typically need a base case and a recursive step.").
        *   Outlining a general *sequence of steps* or a *checklist* for approaching such problems (e.g., "1. Handle edge cases. 2. Implement the main logic. 3. Test thoroughly.").
        *   Mentioning relevant *data structures or control flow patterns* typically used for this problem category.
        *   Explaining *why* a particular strategy is effective or standard practice.
    *   **Crucially differentiate:** This feedback should teach a *method*, not just fix the current error (that's KH) and not just ask the student to reflect.
    *   You *may* include a small, *abstract* code snippet illustrating the strategy, but it must **not** solve the specific task.

2.  **Identify and Explain Mistakes (Output to "KM" field):**
    * Analyze the student’s solution and point out the mistakes **clearly and concisely**.
    * **Avoid lengthy explanations or repetition** – keep it short and focused.
    * For each mistake:
      * **State what is wrong**, as directly as possible.
      * **Briefly explain why** it is wrong (max. 2 short sentences per point).
      * Reference relevant information from the task description if it helps clarify the mistake.
      * If the mistake relates to a compiler error, briefly explain the meaning of the compiler message in simple terms before explaining the underlying code issue
    * **Never include suggestions, fixes or any diret information on how to proceed**: Keep this for the "KH" field.
    * Example style and brevity:
      - "The loop never terminates because the stop condition is never met."
      - "Variable is not initialized – see compiler error: 'Variable might not have been initialized': This means that you're trying to use a variable that might not have a value yet"

3.  **Explain Concepts & Cite Sources (Output to "KC" field):**
    *   Identify the fundamental programming concepts relevant to the task and the student's errors.
    *   Explain these concepts clearly and concisely.
    *   If the concept is a programming concept, provide a small code snippet in a HTML-Code Block and explain the syntax and usage of the concept. This example must be abstract and **must not relate explicitly to the task or the student's solution**. For example, if the concept is a "for loop", provide a generic example of a for loop in the programming language used in the task.
    *   **CRITICAL:** Examine the provided 'Relevant Lecture Snippets' JSON. If snippets relevant to the concept exist, you MUST integrate information from them into your explanation and cite the source using the EXACT placeholder format $$Number$$ (where Zahl corresponds to the 'Quelle' field number in the snippet JSON).
        * Example: "Variable scope determines where a variable can be accessed. In C++, variables declared inside a function are typically local to that function $$4$$." (Assuming snippet 4 explains local scope).
        *   If no relevant lecture snippet is available for a concept, explain it using your general knowledge but clearly state that no specific lecture material was found for this point.

4.  **Provide Guidance on How to Proceed (Output to "KH" field):**
    *   Provide a single next step hint that guide the student towards correcting the identified mistakes (Step 2) and understanding the concepts (Step 3).
    *   This should be a clear, actionable suggestion that the student can follow. You can include a small code snippet (1-2 lines) in HTML-Code Block format to illustrate your point, but **do not provide a complete solution**.

# Final Instruction:
Generate ONLY the structured JSON object adhering to the schema and following the processing steps outlined above based on the provided context. Stay in your role and use the specified tone and language. You answer directly to the student.

`;
    const humanPrompt = `
    I am the student. Please help me following your custom instructions.
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
        new HumanMessage(humanPrompt),
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
              return `${link}`;
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

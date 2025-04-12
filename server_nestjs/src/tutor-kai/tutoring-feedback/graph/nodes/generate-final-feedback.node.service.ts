import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'; // Added InternalServerErrorException
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai'; // Assuming OpenAI, adjust if different
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { TutoringFeedbackState } from '../state';
import { FeedbackOutputSchema, FeedbackOutput } from '../schemas/feedback-output.schema'; // Added FeedbackOutput type
import { PrismaService } from 'src/prisma/prisma.service'; // Added PrismaService import
@Injectable()
export class GenerateFinalFeedbackNodeService {
  private readonly logger = new Logger(GenerateFinalFeedbackNodeService.name);
  private llm: ChatOpenAI; // We'll configure this properly later via LlmProviderService

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService, // Injected PrismaService
  ) {
    // Basic LLM initialization - replace with proper injection/configuration
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-2024-08-06',
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
    // Ensure codeSubmissionId exists in the context
    if (!feedbackContext.codeSubmissionId) {
        this.logger.error('codeSubmissionId is missing from feedbackContext.');
        return { error: 'codeSubmissionId is missing in GenerateFinalFeedbackNode.' };
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

    * You are an empathetic programming professor with high computer science education **expertise**.
    * Your primary goal is to provide comprehensive, pedagogically sound, and encouraging feedback to a computer science student.

    # Tone & Language:

    * Speak as if you were a patient and friendly tutor helping a student. Address the student **informally** as "Du" (you) instead of **in the** third person (e.g., "Der Student"). **For example**: "Du hast" instead of "Der Student hat".
    * Use simple, beginner-friendly language that is easy to understand, especially for someone new to programming.
    * Respond in German.

    # Task:

    * Generate a structured JSON feedback object based on the provided context (task description, student solution, compiler/test results, potential fixed code, and lecture snippets).
    * Adhere STRICTLY to the JSON output schema defined below and follow the specified steps based on your persona and using the specified tone.
    * Format your answer in each field with **markdown** and ensure it is clear and easy to read. **Never use Markdown code blocks.** Instead, use HTML **code blocks** for code snippets (e.g., <pre><code class="language-python">def initialisiere_variable():\n  meine_variable = 100\n  return meine_variable\n</code></pre>).

    # Processing Steps (Follow these sequentially):

    1.  **Provide Strategic Processing Steps (Output to "SPS" field):**
        * Provide information about the **systematic, strategic approach** to solving this *type* of task and similar tasks. Focus on the **generalizable process or method**.
        * This may include:
            * Identifying the *category* of the problem (e.g., iteration over a collection, recursive base cases/steps, input validation, searching/sorting).
            * Suggesting standard *algorithms, design patterns, or common programming idioms* suitable for this category (e.g., "For iterating through all elements, a for-each loop is often suitable," "Recursive solutions typically need a base case and a recursive step.").
            * Outlining a general *sequence of steps* or a *checklist* for approaching such problems (e.g., "1. Handle edge cases. 2. Implement the main logic. 3. Test thoroughly."). Use a numbered markdown list for clarity.
            * Mentioning relevant *data structures or control flow patterns* typically used for this problem category.
            * Explaining *why* a particular strategy is effective or standard practice.
        * **Crucially differentiate:** This feedback should teach a *method*, not just fix the current error (that's KH) and not just ask the student to reflect.

    2.  **Identify Mistakes (Output to "KM" field):**
        * Focus purely on identifying mistakes — as a reviewer, not a tutor. Do not guide, correct, or suggest solutions.
        * **Avoid lengthy explanations or repetition** – keep it short and focused.
        * State what is wrong, as directly as possible.
        * Reference relevant information from the task description if it helps clarify the mistake.
        * If the mistake relates to a compiler error, briefly explain the meaning of the compiler message in simple terms.
        * Do not include lecture references (these belong in the "KC" field).
        * **CRITICAL: Never provide fixes, alternative approaches, or any other information on how to proceed!**
        * Examples:
             * **Good:** "The loop condition ${"`i > 10`"} is incorrect and prevents the loop from executing."
             * **Bad:** "The loop condition ${"`i > 10`"} is incorrect and prevents the loop from executing. Change the condition to ${"`i < 10`"} to make the loop run." (This violates the instruction to avoid giving fixes.)
             * **Good:** "Array index is out of bounds—see compiler error: 'ArrayIndexOutOfBoundsException'. You're accessing an array position that does not exist."
             * **Bad:** "Array index is out of bounds—see compiler error: 'ArrayIndexOutOfBoundsException'. You're accessing an array position that does not exist. Make sure the index is within the valid array range." (This violates the instruction to avoid giving hints.)
             * **Good:** "The expression ${"`(jahr/4)`"} is not appropriate. It returns a truthy value based on division but does not check for divisibility by 4."
             * **Bad:** "The expression ${"`(jahr/4)`"} is not correct. Instead, you should use the modulo operator ${"`%`"} to check whether ${"`jahr`"} is divisible by 4." (It explicitly suggests a correction (use the modulo operator ${"`%`"}), which violates the instruction to avoid giving an alternative approach.)

    3.  **Explain Concepts & Cite Sources (Output to "KC" field):**
        * Identify the fundamental programming concepts relevant to the task and the student's errors (Step 2).
        * Explain these concepts clearly and concisely.
        * If the concept is a programming concept, provide one small code snippet in an HTML **code block** and explain the syntax and usage of the concept. **This code snippet must be generic and must relate to a completely different use case than the task and the student's code.** For example, if the concept is a "for loop," provide a generic example of a for loop in the programming language used in the task.
        * **CRITICAL:** Examine the provided 'Relevant Lecture Snippets' JSON. If snippets relevant to the identified concept exist, you MUST integrate information from them into your explanation and cite the source using the EXACT placeholder format $$Number$$ (where Number  corresponds to the 'Quelle' field number in the snippet JSON).
            * Example: "Variable scope determines where a variable can be accessed. In C++, variables declared inside a function are typically local to that function $$4$$." (Assuming snippet 4 explains local scope).
        * If no relevant lecture snippet is available for a concept, explain it using your general knowledge.

    4.  **Provide Guidance on How to Proceed (Output to "KH" field):**
        * Provide a single next step hint that **guides** the student towards correcting the identified mistakes (Step 2).
        * This should be a clear, actionable suggestion that the student can follow to get closer to the correct solution. You can include a very short code snippet (only 1-2 lines) in HTML **code block** format to illustrate your point, but **do not provide a complete solution**.

    # Final Instruction:

    * The key difference **between Step 2 and Step 4** is that Step 2 focuses on identifying mistakes, while **ONLY Step 4 provides guidance on how to proceed**.
    * Generate ONLY the structured JSON object adhering to the schema and following the processing steps outlined above based on the provided context. Stay in your role and use the specified tone and language. **Answer** directly to the student.

    `;

        const humanPrompt =
    `I am the student. Please help me following your custom instructions.

    # Context

    ## Task Description

    ${feedbackContext.taskDescription}

    ## Student Solution

    ${feedbackContext.studentSolution}

    ## Compiler Output

    ${feedbackContext.compilerOutput || 'None provided.'}

    ## Automated Tests

    ### Unit Test Definitions

    ${ feedbackContext.automatedTests ? feedbackContext.automatedTests[0].code : 'None provided.' }

    ### Unit Test Results

    ${ feedbackContext.unitTestResults ? JSON.stringify(feedbackContext.unitTestResults) : 'None provided.' }

    ## Correct Solution (Reference)

    ${fixedCode || 'None available.'}

    ## Relevant Lecture Snippets (JSON) ---

    ${(lectureSnippets && lectureSnippets !== '[]') ? lectureSnippets : 'None available.'}

    `;
    // Combine prompts for storage
    const finalPrompt = `${systemPrompt}\n\n${humanPrompt}`;

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

      if (processedFeedback.KM && sourceMap && Object.keys(sourceMap).length > 0) {
        this.logger.log('Processing citations in KM field...');
        processedFeedback.KM = processedFeedback.KM.replace(
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


      // --- Persist Feedback ---
      try {
        const newFeedback = await this.prisma.generatedFeedback.create({
          data: {
            spsContent: processedFeedback.SPS,
            kmContent: processedFeedback.KM,
            kcContent: processedFeedback.KC,
            khContent: processedFeedback.KH,
            finalPrompt: finalPrompt, // Store the combined prompt
            codeSubmissionId: feedbackContext.codeSubmissionId, // Use the ID from context
            // Timestamps (spsUsedAt, etc.) default to null
          },
        });
        this.logger.log(`Successfully saved generated feedback with ID: ${newFeedback.id}`);
        // Return feedback JSON and the new ID
        return { finalFeedbackJson: processedFeedback, generatedFeedbackId: newFeedback.id };

      } catch (dbError) {
        this.logger.error(
          `Error saving generated feedback to database: ${dbError.message}`,
          dbError.stack,
        );
        // Return an error state if DB saving fails, but after LLM succeeded
        return { error: `Failed to save generated feedback: ${dbError.message}` };
      }
      // --- End Persist Feedback ---

    } catch (llmError) {
      this.logger.error(
        `Error generating final feedback from LLM: ${llmError.message}`,
        llmError.stack,
      );
      // TODO: Implement more robust error handling / retry logic
      return { error: `Failed to generate final feedback: ${llmError.message}` };
    }
  }
}

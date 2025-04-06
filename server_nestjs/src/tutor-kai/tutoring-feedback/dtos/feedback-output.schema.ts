import { z } from 'zod';

/**
 * Zod schema for the Knowledge about Correct Results (KCR) component.
 * Includes an explanation and step-by-step processing instructions.
 */
export const KcrSchema = z.object({
  explanation: z
    .string()
    .describe(
      'Explanation of the correct result or approach for the programming task.',
    ),
  steps: z
    .array(z.string())
    .describe(
      'Step-by-step instructions on how to arrive at the correct solution.',
    ),
});

/**
 * Zod schema for the final structured feedback output.
 * Based on the feedback types defined by Narciss (2006) and Keuning et al. (2018).
 */
export const FeedbackOutputSchema = z.object({
  IT: z
    .string()
    .describe(
      'Internal Thoughts: Hidden chain-of-thought detailing pedagogical and didactic considerations behind the feedback.',
    ),
  KCR: KcrSchema.describe(
    'Knowledge about Correct Results: Information about the correct solution, including explanation and processing steps.',
  ),
  KM: z
    .string()
    .describe(
      'Knowledge about Mistakes: Information about the errors identified in the student submission (type, location, cause).',
    ),
  KTC: z
    .string()
    .describe(
      'Knowledge about Task Constraints: Information regarding specific rules, requirements, or constraints of the programming task.',
    ),
  KC: z
    .string()
    .describe(
      'Knowledge about Concepts: Explanation of relevant programming concepts, citing lecture snippets where applicable.',
    ),
  KH: z
    .string()
    .describe(
      'Knowledge about How to Proceed: Strategic guidance and hints on how the student can move forward or correct their solution.',
    ),
});

// Type alias for easier usage
export type FeedbackOutput = z.infer<typeof FeedbackOutputSchema>;
export type KcrOutput = z.infer<typeof KcrSchema>;

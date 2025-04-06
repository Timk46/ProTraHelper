import { z } from 'zod';


/**
 * Zod schema for the final structured feedback output.
 * Based on the feedback types defined by Narciss (2006) and Keuning et al. (2018).
 */
export const FeedbackOutputSchema = z.object({
  KCR: z
  .string()
  .describe(
    'Field for Step 1 Describe Correct Approach',
  ),
  IT: z
    .string()
    .describe(
      'Internal Thoughts: Hidden chain-of-thought detailing pedagogical and didactic considerations behind the feedback.',
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

import { z } from 'zod';


/**
 * Zod schema for the final structured feedback output.
 * Based on the feedback types defined by Narciss (2006) and Keuning et al. (2018).
 */
export const FeedbackOutputSchema = z.object({
  KCR: z
  .string()
  .describe(
    'Knowledge about Correct Result: Field for Step 1 Describe Correct Approach',
  ),
  KM: z
    .string()
    .describe(
      'Knowledge about Mistakes: Information about the errors identified in the student submission (type, location, cause).',
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

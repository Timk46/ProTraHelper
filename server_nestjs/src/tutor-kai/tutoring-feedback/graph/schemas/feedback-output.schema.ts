import { z } from 'zod';


/**
 * Zod schema for the final structured feedback output.
 * Based on the feedback types defined by Narciss (2006) and Keuning et al. (2018).
 */
export const FeedbackOutputSchema = z.object({
  SPS: z
  .string()
  .describe(
    'Strategic Processing Steps (SPS) ',
  ),
  KM: z
    .string()
    .describe(
      'Knowledge about Mistakes (KM)',
    ),
  KC: z
    .string()
    .describe(
      'Knowledge about Concepts (KC)',
    ),
  KH: z
    .string()
    .describe(
      'Knowledge about How to Proceed (KH)',
    ),
});

// Type alias for easier usage
export type FeedbackOutput = z.infer<typeof FeedbackOutputSchema>;

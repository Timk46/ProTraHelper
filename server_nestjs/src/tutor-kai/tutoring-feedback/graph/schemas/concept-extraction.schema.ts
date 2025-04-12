import { z } from 'zod';

/**
 * Zod schema for the output of the concept extraction LLM call.
 * Expects an array containing the names of the extracted programming concepts.
 */
export const ConceptExtractionSchema = z.object({
  concepts: z
    .array(z.string())
    .describe(
      'An array containing the search queries',
    ),
});

// Type alias for easier usage
export type ConceptExtractionOutput = z.infer<typeof ConceptExtractionSchema>;

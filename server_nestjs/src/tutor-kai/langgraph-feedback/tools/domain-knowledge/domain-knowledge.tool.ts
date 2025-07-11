import { DynamicStructuredTool } from '@langchain/core/tools'; // Changed import
import type { DomainKnowledgeService } from './domain-knowledge.service';
import { z } from 'zod';
// Removed Injectable import as it's not used directly in this file

// Define the schema for the tool's input using Zod
const DomainKnowledgeToolSchema = z.object({
  query: z
    .string()
    .describe(
      'The specific concept or question to search for in the lecture materials (e.g., "for loop syntax", "what is recursion?").',
    ),
  k: z
    .number()
    .int()
    .positive()
    .optional()
    .default(10)
    .describe(
      'The maximum number of relevant lecture snippets to retrieve. Minumum is 10, maximum is 20.',
    ),
});

// Type for the input based on the Zod schema
type DomainKnowledgeToolInput = z.infer<typeof DomainKnowledgeToolSchema>;

/**
 * Creates an instance of the Domain Knowledge Tool.
 * This tool searches lecture transcripts for relevant information using vector similarity.
 *
 * @param domainKnowledgeService An instance of the DomainKnowledgeService.
 * @returns A DynamicStructuredTool instance.
 */
export function createDomainKnowledgeTool(
  domainKnowledgeService: DomainKnowledgeService,
): DynamicStructuredTool {
  // Changed return type
  return new DynamicStructuredTool({
    // Changed instantiation
    name: 'search_domain_knowledge',
    description: `Searches the lecture transcripts and materials for relevant information based on a query (e.g., a concept, keyword, or question). Returns snippets of relevant text content. Use this to answer questions about programming concepts, syntax, or topics covered in the course.`, // Simplified description
    schema: DomainKnowledgeToolSchema, // Provide schema directly
    func: async (
      input: DomainKnowledgeToolInput, // Input is now the structured object
      runManager?,
    ): Promise<string> => {
      try {
        // Input is already parsed and validated by LangChain via the schema
        const { query, k } = input; // Destructure directly

        const results = await domainKnowledgeService.searchLectureContent(
          query,
          k, // k will have the default value if not provided
        );

        // Return the raw results as a JSON string for the agent to process
        // Return '[]' if no results are found, as expected by the processing node
        if (!results || results.length === 0) {
          // Log that no results were found for the query
          console.log(`DomainKnowledgeTool: No relevant information found for query: "${query}"`);
          return '[]';
        }

        // Stringify the results array directly
        return JSON.stringify(results);
      } catch (error) {
        // Log the structured input in case of error
        console.error('Error executing domain knowledge tool with input:', input, error);
        // Error handling remains largely the same, but ZodError during parse is less likely here
        return `Error searching domain knowledge: ${error.message || 'Unknown error'}`;
      }
    },
  });
}

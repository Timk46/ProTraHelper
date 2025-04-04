import { DynamicTool, DynamicToolInput } from '@langchain/core/tools';
import { DomainKnowledgeService } from './domain-knowledge.service';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

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
    .default(3)
    .describe('The maximum number of relevant lecture snippets to retrieve.'),
});

// Type for the input based on the Zod schema
type DomainKnowledgeToolInput = z.infer<typeof DomainKnowledgeToolSchema>;

/**
 * Creates an instance of the Domain Knowledge Tool.
 * This tool searches lecture transcripts for relevant information using vector similarity.
 *
 * @param domainKnowledgeService An instance of the DomainKnowledgeService.
 * @returns A DynamicTool instance.
 */
export function createDomainKnowledgeTool(
  domainKnowledgeService: DomainKnowledgeService,
): DynamicTool {
  const toolConfig: DynamicToolInput = {
    name: 'search_domain_knowledge',
    description: `Searches the lecture transcripts and materials for relevant information based on a query (e.g., a concept, keyword, or question). Returns snippets of relevant text content. Use this to answer questions about programming concepts, syntax, or topics covered in the course. Input MUST be a JSON string representing an object with 'query' (string) and optional 'k' (number, default 3). Example: '{"query": "recursion", "k": 5}'`,
    // 'schema' is not a valid property for DynamicToolInput, remove it.
    // The Zod schema is used internally for validation within the func.
    // Accept input as string, parse and validate inside
    func: async (
      inputString: string, // Input is now expected as a string
      runManager?,
    ): Promise<string> => {
      try {
        // 1. Parse the JSON string input
        let parsedInput: any;
        try {
          parsedInput = JSON.parse(inputString);
        } catch (parseError) {
          return `Error: Invalid JSON input string provided to domain knowledge tool. Input: ${inputString}`;
        }

        // 2. Validate the parsed object using the Zod schema
        const validatedInput = DomainKnowledgeToolSchema.parse(parsedInput);
        const { query, k } = validatedInput;

        const results = await domainKnowledgeService.searchLectureContent(
          query,
          k,
        );

        if (!results || results.length === 0) {
          return `No relevant information found for query: "${query}"`;
        }

        // Format the results for the LLM
        const formattedResults = results
          .map(
            (chunk, index) =>
              `Snippet ${index + 1} (Source: ${chunk.metadata?.markdownLink || 'Unknown'}):\n${chunk.TranscriptChunkContent}`,
          )
          .join('\n\n---\n\n');

        return `Found relevant information for query "${query}":\n\n${formattedResults}`;
      } catch (error) {
        console.error('Error executing domain knowledge tool:', error);
        // Provide a meaningful error message back to the LLM/agent
        if (error instanceof z.ZodError) {
          return `Error: Invalid input format for domain knowledge tool. ${error.message}`;
        }
        return `Error searching domain knowledge: ${error.message || 'Unknown error'}`;
      }
    },
    // returnDirect: false, // Default is false, tool result goes back to the agent
  };

  return new DynamicTool(toolConfig);
}

// Note: This function creates the tool instance.
// The DomainKnowledgeService instance needs to be provided (likely via dependency injection)
// where this tool is instantiated and passed to the agents.

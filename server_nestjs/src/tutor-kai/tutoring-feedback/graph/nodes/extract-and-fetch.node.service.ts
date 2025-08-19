import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { TutoringFeedbackState } from '../state';
import { ConceptExtractionSchema } from '../schemas/concept-extraction.schema';
// Adjust path based on actual location if necessary
import { DomainKnowledgeService } from '../../../langgraph-feedback/tools/domain-knowledge/domain-knowledge.service';

@Injectable()
export class ExtractAndFetchNodeService {
  private readonly logger = new Logger(ExtractAndFetchNodeService.name);
  private readonly llm: ChatOpenAI;

  constructor(
    private readonly configService: ConfigService,
    // Ensure DomainKnowledgeModule is imported where this service is provided (e.g., TutoringFeedbackModule)
    private readonly domainKnowledgeService: DomainKnowledgeService,
  ) {
    // Basic LLM initialization - consider a shared LlmProviderService
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4.1-2025-04-14',
      temperature: 0,
    });
  }

  /**
   * Executes the node's logic: extracts concepts and fetches lecture snippets.
   * @param state The current LangGraph state.
   * @returns A partial state object containing concepts, snippets, sourceMap, and potential error.
   */
  async execute(state: TutoringFeedbackState): Promise<Partial<TutoringFeedbackState>> {
    this.logger.log('Executing ExtractAndFetch Node');
    const { feedbackContext } = state;

    // --- Start: Concept Extraction Logic ---
    let extractedConcepts: string[] = [];
    let extractionError: string | undefined = undefined;

    if (!feedbackContext) {
      this.logger.error('FeedbackContext is missing from state.');
      // Return immediately if context is missing, as nothing can be done
      return {
        concepts: [],
        lectureSnippets: '[]',
        sourceMap: {},
        error: 'FeedbackContext is missing in ExtractAndFetchNode.',
      };
    }

    const { studentSolution, taskDescription, compilerOutput, unitTestResults } = feedbackContext;

    // Prepare context string for the prompt
    let contextString = `Task Description:\n\`\`\`\n${taskDescription}\n\`\`\`\n\nStudent Solution:\n\`\`\`\n${studentSolution}\n\`\`\``;
    if (compilerOutput) {
      contextString += `\n\nCompiler Output:\n\`\`\`\n${compilerOutput}\n\`\`\``;
    }
    if (unitTestResults) {
      contextString += `\n\nUnit Test Results:\n\`\`\`\n${JSON.stringify(
        unitTestResults,
        null,
        2,
      )}\n\`\`\``;
    }

    const systemPrompt = `
# Role and Objective
- You are a programming professor with extensive computer science expertise. 
- Your task is to analyze a student's code submission carefully. 
- Based on the provided context identify the **one to four most relevant programming concepts** the student is struggling with.

# Instructions
## 1. **Prioritize Errors**
If there is a compiler or runtime error, focus specifically on the concept directly related to that error (e.g., IndentationError in Python → "Explain Indentation (Python)").

## 2. **Central Concept Identification**
f no explicit errors exist, identify the core programming concept central to resolving the student's task, such as:
   - Control structures
   - Data structures
   - Algorithms
   - Language-specific syntax
   - Object-oriented principles

## 3. **Formulate one to four Search Queries**
Clearly rephrase the identified concepts into a concise, searchable queries (what would the student ask for help on) suitable for semantic similarity search. 
Follow the pattern:
   - "Explain [Concept] ([Programming Language])"
   - "What is [Concept] ([Programming Language])"

# Examples
- "Explain Recursion (Java)"
- "Difference between For Loops and While Loops (Python)"
- "Explain Data Types (Java)"
- "Explain Conditional Statements (Python)"

# Context
${contextString}

# Final instructions
- Always explicitly include the programming language in parentheses. The search queries must be in **german language**.
`;

    const llmWithStructure = this.llm.withStructuredOutput(ConceptExtractionSchema, {
      name: 'extract_concepts',
    });

    try {
      const response = await llmWithStructure.invoke([new SystemMessage(systemPrompt)]);
      extractedConcepts = response.concepts ?? [];
      this.logger.log(`Successfully extracted concepts: ${extractedConcepts.join(', ')}`);
    } catch (error) {
      this.logger.error(`Error extracting concepts: ${error.message}`, error.stack);
      extractionError = `Failed to extract concepts: ${error.message}`;
      // Concepts will be empty, proceed to snippet fetching which will likely return default
    }
    // --- End: Concept Extraction Logic ---

    // --- Start: Fetch Snippets Logic ---
    const defaultSnippetReturn = { lectureSnippets: '', sourceMap: {} }; // Default to empty string
    let lectureSnippetsResult = defaultSnippetReturn;
    let snippetError: string | undefined = undefined;
    // console.log('extractedConcepts', extractedConcepts); // Keep or remove logging as needed

    if (extractedConcepts.length > 0) {
      try {
        let sourceCounter = 0;
        const sourceMapDict: Record<string, string> = {};
        const groupedSnippets: {
          query: string;
          snippets: { content: string; sourceId: string }[];
        }[] = [];
        let totalSnippetsProcessed = 0;

        for (const concept of extractedConcepts) {
          const rawSnippets: any[] = await this.domainKnowledgeService.searchLectureContent(
            concept,
          );
          this.logger.log(`Found ${rawSnippets.length ?? 0} raw snippets for concept: ${concept}`);

          const currentQuerySnippets: { content: string; sourceId: string }[] = [];

          if (rawSnippets && rawSnippets.length > 0) {
            for (const chunk of rawSnippets) {
              const content = chunk.TranscriptChunkContent ?? chunk.pageContent;
              const metadata = chunk.metadata;
              const markdownLink = metadata?.markdownLink;

              if (content && markdownLink) {
                sourceCounter++;
                const sourceId = `$$${sourceCounter}$$`;
                currentQuerySnippets.push({
                  content: content,
                  sourceId: sourceId,
                });
                sourceMapDict[sourceCounter.toString()] = markdownLink;
                totalSnippetsProcessed++;
              } else {
                this.logger.warn(
                  'Skipping transcript chunk due to missing content or markdownLink:',
                  chunk,
                );
              }
            }
          }
          // Add the group even if no snippets were found for this concept,
          // so the query numbering remains consistent if needed later.
          // Or filter out empty groups if preferred. Let's add it for now.
          groupedSnippets.push({ query: concept, snippets: currentQuerySnippets });
        }

        // Generate Markdown string
        let markdownOutput = '';
        groupedSnippets.forEach((group, index) => {
          // Only add header if there are snippets for this query
          if (group.snippets.length > 0) {
            markdownOutput += `### ${group.query}\n\n`; // Use the actual query string
            group.snippets.forEach(snippet => {
              markdownOutput += `#### Source (${snippet.sourceId})\n${snippet.content}\n\n`;
            });
            markdownOutput += '\n'; // Add space between queries
          }
        });

        // Remove trailing newline if it exists
        markdownOutput = markdownOutput.trimEnd();

        lectureSnippetsResult = {
          lectureSnippets: markdownOutput,
          sourceMap: sourceMapDict,
        };
        this.logger.log(
          `Successfully processed ${totalSnippetsProcessed} snippets into Markdown format.`,
        );
      } catch (error) {
        this.logger.error(`Error fetching/processing snippets: ${error.message}`, error.stack);
        snippetError = `Failed to fetch/process lecture snippets: ${error.message}`;
        lectureSnippetsResult = defaultSnippetReturn; // Use default on error
      }
    } else {
      this.logger.warn('No concepts extracted, skipping snippet fetch.');
      lectureSnippetsResult = defaultSnippetReturn; // Use default if no concepts
    }
    // --- End: Fetch Snippets Logic ---

    // Combine results and potential errors
    const combinedError = [extractionError, snippetError].filter(Boolean).join('; ');

    return {
      concepts: extractedConcepts,
      ...lectureSnippetsResult,
      ...(combinedError && { error: combinedError }),
    };
  }
}

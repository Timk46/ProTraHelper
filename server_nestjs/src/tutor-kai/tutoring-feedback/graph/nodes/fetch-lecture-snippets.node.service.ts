import { Injectable, Logger } from '@nestjs/common';
import { TutoringFeedbackState } from '../state';
// TODO: Adjust this import path based on the actual location of DomainKnowledgeService
import { DomainKnowledgeService } from '../../../langgraph-feedback/tools/domain-knowledge/domain-knowledge.service';

@Injectable()
export class FetchLectureSnippetsNodeService {
  private readonly logger = new Logger(FetchLectureSnippetsNodeService.name);

  constructor(
    // TODO: Ensure DomainKnowledgeModule is imported in TutoringFeedbackModule
    private domainKnowledgeService: DomainKnowledgeService,
  ) {}

  /**
   * Executes the node's logic: fetches lecture snippets based on extracted concepts.
   * @param state The current LangGraph state.
   * @returns A partial state object containing the fetched lectureSnippets.
   */
  async execute(
    state: TutoringFeedbackState,
  ): Promise<Partial<TutoringFeedbackState>> {
    this.logger.log('Executing FetchLectureSnippets Node');
    const { concepts } = state;

    const defaultReturn = { lectureSnippets: '[]', sourceMap: {} }; // Default empty state

    if (!concepts || concepts.length === 0) {
      this.logger.warn('No concepts found in state to fetch snippets for.');
      return defaultReturn; // Return default empty state
    }

    this.logger.log(`Fetching snippets for concepts: ${concepts.join(', ')}`);

    try {
      let sourceCounter = 0;
      const sourceMapDict: Record<string, string> = {};
      const allFormattedSnippets = []; // Store formatted snippets

      for (const concept of concepts) {
        // Assuming searchLectureContent returns TranscriptChunk[] or similar
        // We need to adjust based on the actual return type if different
        const rawSnippets: any[] = await this.domainKnowledgeService.searchLectureContent(
          concept,
        );

        this.logger.log(
          `Found ${rawSnippets?.length ?? 0} raw snippets for concept: ${concept}`,
        );

        if (rawSnippets && rawSnippets.length > 0) {
           // Process snippets similar to KcAgent.processToolResults
           for (const chunk of rawSnippets) {
               // Adapt property names if the actual TranscriptChunk structure differs
               const content = chunk.TranscriptChunkContent ?? chunk.pageContent; // Handle potential variations
               const metadata = chunk.metadata;
               const markdownLink = metadata?.markdownLink;

               if (content && markdownLink) {
                   sourceCounter++;
                   // Store the formatted explanation and placeholder
                   allFormattedSnippets.push({
                       Erklärung: content,
                       Quelle: `$$${sourceCounter}$$`, // Placeholder for citation
                       // Konzept: concept, // Keep concept info if needed for debugging/logging, but remove for final structure
                   });
                   // Store the actual link in the map
                   sourceMapDict[sourceCounter.toString()] = markdownLink;
               } else {
                   this.logger.warn("Skipping transcript chunk due to missing content or markdownLink:", chunk);
               }
           }
        }
      }

       // Structure for the prompt (simplified as one concept group like in KcAgent)
       const conceptsForPrompt = [{
           Konzept: "Relevante Vorlesungsinhalte", // Generic concept name
           Inhalte: allFormattedSnippets, // Array of { Erklärung, Quelle }
       }];

       const lectureSnippetsString = JSON.stringify({ Vorlesungsausschnitte: conceptsForPrompt });


      this.logger.log(
        `Successfully processed ${allFormattedSnippets.length} snippets into JSON string and created source map with ${Object.keys(sourceMapDict).length} entries.`,
      );

      // Return the formatted string and the source map
      return {
          lectureSnippets: lectureSnippetsString,
          sourceMap: sourceMapDict
      };

    } catch (error) {
      this.logger.error(
        `Error fetching or processing lecture snippets: ${error.message}`,
        error.stack,
      );
      // Return default empty state on error, plus error message
      return { ...defaultReturn, error: `Failed to fetch/process lecture snippets: ${error.message}` };
    }
  }
}

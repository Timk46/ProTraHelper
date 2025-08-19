import { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { CompiledStateGraph, StateGraph, START, END } from '@langchain/langgraph'; // Keep single import

import { TutoringFeedbackState } from './state';
import { TutoringFeedbackStateAnnotation } from './state';
import { GenerateFixedCodeNodeService } from './nodes/generate-fixed-code.node.service';
// Removed ExtractConceptsNodeService and FetchLectureSnippetsNodeService
import { ExtractAndFetchNodeService } from './nodes/extract-and-fetch.node.service'; // Added combined node
import { GenerateFinalFeedbackNodeService } from './nodes/generate-final-feedback.node.service';
import { FeedbackOutput } from './schemas/feedback-output.schema';

@Injectable()
export class GraphBuilderService implements OnModuleInit {
  private readonly logger = new Logger(GraphBuilderService.name);
  private compiledGraph; // Let TypeScript infer the type

  constructor(
    private readonly generateFixedCodeNode: GenerateFixedCodeNodeService,
    // Removed extractConceptsNode and fetchLectureSnippetsNode
    private readonly extractAndFetchNode: ExtractAndFetchNodeService, // Added combined node service
    private readonly generateFinalFeedbackNode: GenerateFinalFeedbackNodeService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing and compiling the Tutoring Feedback Graph...');
    this.compiledGraph = this.buildGraph();
    this.logger.log('Tutoring Feedback Graph compiled successfully.');
  }

  /**
   * Builds and compiles the LangGraph for the tutoring feedback workflow.
   */
  private buildGraph() {
    // Let TypeScript infer the return type
    const workflow = new StateGraph(TutoringFeedbackStateAnnotation);

    // Add nodes using arrow functions to call service methods
    workflow.addNode('generate_fixed_code', (state: TutoringFeedbackState) =>
      this.generateFixedCodeNode.execute(state),
    );
    // Removed 'extract_concepts' and 'fetch_lecture_snippets' nodes
    workflow.addNode('extract_and_fetch_snippets', (state: TutoringFeedbackState) =>
      this.extractAndFetchNode.execute(state),
    );
    workflow.addNode('generate_final_feedback', (state: TutoringFeedbackState) =>
      this.generateFinalFeedbackNode.execute(state),
    );
    // Simple join node - does nothing but act as a synchronization point
    workflow.addNode('join_branches', (state: TutoringFeedbackState) => {
      this.logger.debug('Reached join node after parallel branches.');
      return {}; // No state update needed here
    });

    // Define the routing function to be called AFTER the join node
    const routeAfterJoin = (state: TutoringFeedbackState): string => {
      this.logger.debug(
        `Routing after join. FixedCode: ${!!state.fixedCode}, Snippets/SourceMap: ${!!state.sourceMap}`,
      );
      if (state.fixedCode && state.sourceMap) {
        this.logger.debug('State complete. Proceeding to final feedback.');
        return 'generate_final_feedback';
      } else {
        this.logger.error('State incomplete after join! Ending graph.');
        return END;
      }
    };

    // Define edges from start
    // @ts-ignore - Suppressing persistent type error
    workflow.addEdge(START, 'generate_fixed_code');
    // @ts-ignore - Suppressing persistent type error
    workflow.addEdge(START, 'extract_and_fetch_snippets');

    // Edges from parallel branches to the join node
    // @ts-ignore - Suppressing persistent type error
    workflow.addEdge('generate_fixed_code', 'join_branches');
    // @ts-ignore - Suppressing persistent type error
    workflow.addEdge('extract_and_fetch_snippets', 'join_branches');

    // Conditional edge from the join node

    workflow.addConditionalEdges(
      // @ts-ignore - Suppressing persistent type error for addConditionalEdges source node
      'join_branches', // Source node for the conditional edge
      routeAfterJoin, // Function to decide the next step
      // No mapping needed as the function returns the target node name or END
    );

    // Final Feedback Generation -> End

    // Final edge
    // @ts-ignore - Suppressing persistent type error
    workflow.addEdge('generate_final_feedback', END);

    // Compile the graph
    return workflow.compile();
  }

  /**
   * Returns the compiled LangGraph instance.
   */
  getCompiledGraph() {
    // Let TypeScript infer the return type
    if (!this.compiledGraph) {
      this.logger.error('Graph accessed before compilation finished!');
      // In a real app, might throw an error or wait for compilation
      throw new Error('Tutoring Feedback Graph is not compiled yet.');
    }
    return this.compiledGraph;
  }
}

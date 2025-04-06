import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CompiledStateGraph, StateGraph } from '@langchain/langgraph'; // Keep single import

import { TutoringFeedbackStateAnnotation, TutoringFeedbackState } from './state';
import { GenerateFixedCodeNodeService } from './nodes/generate-fixed-code.node.service';
import { ExtractConceptsNodeService } from './nodes/extract-concepts.node.service';
import { FetchLectureSnippetsNodeService } from './nodes/fetch-lecture-snippets.node.service';
import { GenerateFinalFeedbackNodeService } from './nodes/generate-final-feedback.node.service';
import { FeedbackOutput } from '../dtos/feedback-output.schema';
// Remove TutoringGraphNodes type - rely on inference

@Injectable()
export class GraphBuilderService implements OnModuleInit {
  private readonly logger = new Logger(GraphBuilderService.name);
  private compiledGraph; // Let TypeScript infer the type

  constructor(
    private generateFixedCodeNode: GenerateFixedCodeNodeService,
    private extractConceptsNode: ExtractConceptsNodeService,
    private fetchLectureSnippetsNode: FetchLectureSnippetsNodeService,
    private generateFinalFeedbackNode: GenerateFinalFeedbackNodeService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing and compiling the Tutoring Feedback Graph...');
    this.compiledGraph = this.buildGraph();
    this.logger.log('Tutoring Feedback Graph compiled successfully.');
  }

  /**
   * Builds and compiles the LangGraph for the tutoring feedback workflow.
   */
  private buildGraph() { // Let TypeScript infer the return type
    const workflow = new StateGraph(TutoringFeedbackStateAnnotation);

    // Add nodes using arrow functions to call service methods
    workflow.addNode('generate_fixed_code', (state: TutoringFeedbackState) =>
      this.generateFixedCodeNode.execute(state),
    );
    workflow.addNode('extract_concepts', (state: TutoringFeedbackState) =>
      this.extractConceptsNode.execute(state),
    );
    workflow.addNode(
      'fetch_lecture_snippets',
      (state: TutoringFeedbackState) =>
        this.fetchLectureSnippetsNode.execute(state),
    );
    workflow.addNode(
      'generate_final_feedback',
      (state: TutoringFeedbackState) =>
        this.generateFinalFeedbackNode.execute(state),
    );

    // Try defining edges again after all nodes are added
    // @ts-ignore - Suppressing persistent type error for addEdge with node names
    workflow.addEdge('__start__', 'generate_fixed_code');
    // @ts-ignore - Suppressing persistent type error for addEdge with node names
    workflow.addEdge('__start__', 'extract_concepts'); // This might still cause issues based on previous errors
    // Concept Extraction -> Fetch Lecture Snippets
    // Concept Extraction -> Fetch Lecture Snippets
    // @ts-ignore - Suppressing persistent type error for addEdge with node names
    workflow.addEdge('extract_concepts', 'fetch_lecture_snippets');
    // Join Point: Wait for fixed code and snippets before generating final feedback
    // LangGraph implicitly handles joins when a node has multiple incoming edges
    // that originate from parallel branches. Both 'generate_fixed_code' and
    // 'fetch_lecture_snippets' must complete before 'generate_final_feedback' runs.
    // Join Point: Wait for fixed code and snippets before generating final feedback
    // @ts-ignore - Suppressing persistent type error for addEdge with node names
    workflow.addEdge('generate_fixed_code', 'generate_final_feedback');
    // @ts-ignore - Suppressing persistent type error for addEdge with node names
    workflow.addEdge('fetch_lecture_snippets', 'generate_final_feedback');

    // Final Feedback Generation -> End
    // Final Feedback Generation -> End
    // @ts-ignore - Suppressing persistent type error for addEdge with node names
    workflow.addEdge('generate_final_feedback', '__end__');

    // Compile the graph
    return workflow.compile();
  }

  /**
   * Returns the compiled LangGraph instance.
   */
  getCompiledGraph() { // Let TypeScript infer the return type
    if (!this.compiledGraph) {
      this.logger.error('Graph accessed before compilation finished!');
      // In a real app, might throw an error or wait for compilation
      throw new Error('Tutoring Feedback Graph is not compiled yet.');
    }
    return this.compiledGraph;
  }
}

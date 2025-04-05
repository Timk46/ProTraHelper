import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { Runnable, RunnableLambda, RunnableConfig } from '@langchain/core/runnables';
import { StateGraph, END, StateGraphArgs, Annotation } from '@langchain/langgraph'; // Import Annotation

// Import agents and tools
import { knowledgeAboutMistakesAgent } from './agents/km/km.agent';
import { knowledgeOnHowToProceedAgent } from './agents/kh/kh.agent';
import { kcSystemPrompt } from './agents/kc/kc.agent'; // Import only the prompt
import { knowledgeAboutTaskConstraintsAgent } from './agents/ktc/ktc.agent';
import { DomainKnowledgeService } from './tools/domain-knowledge/domain-knowledge.service';
import { createDomainKnowledgeTool } from './tools/domain-knowledge/domain-knowledge.tool';
import { DynamicTool, DynamicStructuredTool } from '@langchain/core/tools'; // Import DynamicStructuredTool
import { createFeedbackAgent } from './agents/agent.common';
import { buildSupervisorPrompt } from './supervisor/supervisor.prompt';

// --- New State Definition using Annotation ---
const AnnotatedState = Annotation.Root({
  messages: Annotation<BaseMessage[]>, // Correct syntax
  studentSolution: Annotation<string>,
  taskDescription: Annotation<string>,
  compilerOutput: Annotation<string | null>,
  unitTestResults: Annotation<any | null>, // Consider specific type
  attemptCount: Annotation<number>,
  automatedTests: Annotation<any[] | undefined>, // Match Zod optional
  codeGerueste: Annotation<any[] | undefined>, // Match Zod optional
  feedbackOutput: Annotation<string | null>,
  // Add the new field for routing decision
  routingDecision: Annotation<string | typeof END | null>, // Correct syntax
});
// Type alias for the state object derived from Annotation
type GraphState = typeof AnnotatedState.State;
// --- End New State Definition ---

// Define NodeFunction type using the new state type
type NodeFunction = (state: GraphState) => Promise<Partial<GraphState>>;
// Define RouterFunction type using the new state type
type RouterFunction = (state: GraphState) => Promise<Partial<GraphState>>; // Router now updates state

// Define valid node names for type safety (optional but good practice)
type AgentNodeNames = "KC" | "KH" | "KM" | "KTC";
type GraphNodeNames = "router" | AgentNodeNames;


@Injectable()
export class LanggraphFeedbackService implements OnModuleInit {
  private readonly logger = new Logger(LanggraphFeedbackService.name);
  // Use the new GraphState type
  private feedbackGraph: Runnable<GraphState, GraphState>;
  // Service will be injected
  private domainKnowledgeTool: DynamicStructuredTool; // Update type

  constructor(
    private configService: ConfigService,
    private domainKnowledgeService: DomainKnowledgeService, // Inject the service
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Langgraph Feedback Service...');
    try {
      await this.initializeGraph();
      this.logger.log('Langgraph Feedback Service Initialized Successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize Langgraph Feedback Service:', error);
      throw error;
    }
  }

  private async initializeGraph(): Promise<void> {
    const openAIApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    // --- Instantiate Domain Knowledge Tool ---
    this.domainKnowledgeTool = createDomainKnowledgeTool(this.domainKnowledgeService);
    this.logger.log('Domain Knowledge Tool instantiated.');
    // --- End Tool Instantiation ---

    const model = new ChatOpenAI({
      modelName: 'gpt-4o',
      apiKey: openAIApiKey,
      temperature: 0.2,
    });

    // Get the supervisor prompt string
    const supervisorPromptString = buildSupervisorPrompt();
    this.logger.log('Supervisor prompt string built.');

    // --- Start: New StateGraph Implementation ---

    // Instantiate the graph using the AnnotatedState definition
    const workflow = new StateGraph(AnnotatedState);

    // --- Agent Node Wrappers ---
    // Wrapper function adapts agent input/output and wraps in RunnableLambda
    const wrapAgentNode = (agentRunnable: Runnable<any, any>): RunnableLambda<GraphState, Partial<GraphState>> => {
        const nodeFunc: NodeFunction = async (state: GraphState): Promise<Partial<GraphState>> => {
            const agentInput = { messages: state.messages };
            try {
                const agentOutput = await agentRunnable.invoke(agentInput);
                // Agent output should primarily update messages
                return { messages: agentOutput?.messages ?? [] };
            } catch (error) {
                this.logger.error(`Error invoking agent node: ${error}`);
                return { messages: [new AIMessage(`Error processing feedback: ${error.message}`)] };
            }
        };
        return new RunnableLambda({ func: nodeFunc });
    };

    // Wrap the agents
    // --- Create KC Agent Runnable with Tool ---
    const knowledgeAboutConceptsAgentRunnable = createFeedbackAgent(
      'KC',
      kcSystemPrompt, // Use the imported prompt
      [this.domainKnowledgeTool], // Pass the instantiated tool
    );
    const kcNode = wrapAgentNode(knowledgeAboutConceptsAgentRunnable); // Use the local runnable
    const khNode = wrapAgentNode(knowledgeOnHowToProceedAgent);
    const kmNode = wrapAgentNode(knowledgeAboutMistakesAgent);
    const ktcNode = wrapAgentNode(knowledgeAboutTaskConstraintsAgent);
    // --- End Agent Node Wrappers ---

    // Define the Router Logic function - now updates state.routingDecision
    const routerFunction: RouterFunction = async (state: GraphState): Promise<Partial<GraphState>> => {
        this.logger.log('Router: Deciding next agent...');
        const { messages, studentSolution, taskDescription, compilerOutput, unitTestResults, attemptCount, automatedTests, codeGerueste } = state;
        const lastFeedback = messages.filter(msg => msg instanceof AIMessage).pop()?.content?.toString() || 'None';
        let formattedPrompt = supervisorPromptString
            .replace('{taskDescription}', taskDescription || 'Not provided')
            .replace('{codeGerueste}', JSON.stringify(codeGerueste) || 'None')
            .replace('{studentSolution}', studentSolution || 'Not provided')
            .replace('{compilerOutput}', compilerOutput || 'None')
            .replace('{automatedTests}', JSON.stringify(automatedTests) || 'None')
            .replace('{unitTestResults}', JSON.stringify(unitTestResults) || 'None')
            .replace('{attemptCount}', attemptCount?.toString() || 'Unknown')
            .replace('{lastFeedback}', lastFeedback);
        const llmMessages: BaseMessage[] = [ new SystemMessage(formattedPrompt) ];
        this.logger.log(`Router: Sending prompt to LLM (first 200 chars): ${formattedPrompt.substring(0, 200)}...`);

        try {
            const response = await model.invoke(llmMessages);
            let decision = response.content.toString().trim();
            if (decision.startsWith('"') && decision.endsWith('"')) {
                decision = decision.substring(1, decision.length - 1);
            }
            this.logger.log(`Router: LLM decision: '${decision}'`);
            const validAgents: AgentNodeNames[] = ['KC', 'KH', 'KM', 'KTC'];
            if (validAgents.includes(decision as AgentNodeNames)) {
                return { routingDecision: decision }; // Update state with decision
            } else if (decision === END || decision === '__END__') {
                return { routingDecision: END }; // Update state with END
            } else {
                // Attempt extraction from reasoning block
                const reasoningMatch = response.content.toString().match(/<\/reasoning>\s*"?(\w+|__END__)?"?/);
                if (reasoningMatch && reasoningMatch[1]) {
                    const extractedDecision = reasoningMatch[1];
                    this.logger.warn(`Router: Extracted decision '${extractedDecision}' from reasoning block.`);
                    if (validAgents.includes(extractedDecision as AgentNodeNames)) return { routingDecision: extractedDecision };
                    if (extractedDecision === END || extractedDecision === '__END__') return { routingDecision: END };
                }
                this.logger.warn(`Router: Invalid or unparseable decision '${decision}'. Defaulting to END.`);
                return { routingDecision: END }; // Update state with END
            }
        } catch (error) {
            this.logger.error(`Error invoking router LLM: ${error}`);
            return { routingDecision: END }; // Default to END on router error
        }
    };

    // Wrap router function in RunnableLambda
    // No RunnableLambda wrapper needed for routerFunction as it already returns Partial<GraphState>

    // Add nodes to the workflow
    workflow.addNode('KC', kcNode);
    workflow.addNode('KH', khNode);
    workflow.addNode('KM', kmNode);
    workflow.addNode('KTC', ktcNode);
    workflow.addNode('router', routerFunction); // Add the raw router function

    // Set the entry point
    // @ts-ignore - Suppress persistent type error recognizing 'router' node
    workflow.addEdge("__start__", "router");

    // --- New Conditional Edge Logic ---
    // Function to read the decision from state and return the target node name
    const routeLogic = (state: GraphState): AgentNodeNames | "__end__" => { // Return literal string
        const decision = state.routingDecision;
        // Check against END constant but return literal string "__end__"
        if (!decision || decision === END) {
            return "__end__";
        }
        // Decision should be one of the agent node names
        return decision as AgentNodeNames; // Assume decision is a valid agent name if not END
    };

    // Define conditional edges using the routeLogic function and an array of destinations
    // Define conditional edges using a MAP instead of an array
    workflow.addConditionalEdges(
        // @ts-ignore - Suppress persistent type error recognizing 'router' node
        'router',
        routeLogic,
        {
            'KC': 'KC',
            'KH': 'KH',
            'KM': 'KM',
            'KTC': 'KTC',
            "__end__": END
        }
    );
    // --- End New Conditional Edge Logic ---


    // Add edges from each agent directly to END
    // @ts-ignore - Suppress persistent type error recognizing agent nodes
    workflow.addEdge('KC', "__end__");
    // @ts-ignore - Suppress persistent type error recognizing agent nodes
    workflow.addEdge('KH', "__end__");
    // @ts-ignore - Suppress persistent type error recognizing agent nodes
    workflow.addEdge('KM', "__end__");
    // @ts-ignore - Suppress persistent type error recognizing agent nodes
    workflow.addEdge('KTC', "__end__");

    // Compile the graph
    this.feedbackGraph = workflow.compile();
    this.logger.log('Feedback graph compiled using Annotation.Root state and new routing pattern.');

    // --- End: New StateGraph Implementation ---
  }

  async getFeedback(
    studentSolution: string,
    taskDescription: string,
    compilerOutput: string | null,
    unitTestResults: any | null,
    attemptCount: number,
    automatedTests: any[],
    codeGerueste: any[],
  ): Promise<string | null> {
    this.logger.log(`Getting feedback for attempt ${attemptCount}`);

    if (!this.feedbackGraph) {
      this.logger.error('Feedback graph is not initialized. Cannot process request.');
      throw new Error('Feedback service not ready.');
    }

    const contextMessageContent = `
      Analyze my solution for the following task. This is attempt number ${attemptCount}.
      Task Description: ${taskDescription}
      Provided Code Skeleton(s): ${JSON.stringify(codeGerueste) || 'None'}
      My Solution:
      \`\`\`
      ${studentSolution}
      \`\`\`
      Compiler Output: ${compilerOutput || 'None'}
      Automated Tests Definition: ${JSON.stringify(automatedTests) || 'None'}
      Unit Test Results: ${JSON.stringify(unitTestResults) || 'None'}
    `;

    // Initial state must match AnnotatedState structure
    // Note: routingDecision starts as null (default)
    const initialState: Partial<GraphState> = { // Use Partial as not all fields are set initially
      messages: [new HumanMessage(contextMessageContent)],
      studentSolution,
      taskDescription,
      compilerOutput,
      unitTestResults,
      attemptCount,
      automatedTests: automatedTests ?? undefined,
      codeGerueste: codeGerueste ?? undefined,
      feedbackOutput: null,
      // routingDecision is omitted, will use default (null)
    };


    try {
      const config: RunnableConfig = { recursionLimit: 50 };
      // Invoke expects the full initial state structure, even if fields are default
      // LangGraph handles merging the partial input with defaults.
      const finalState = await this.feedbackGraph.invoke(initialState as GraphState, config);

      this.logger.log('Graph execution completed.');

      let feedback: string | null = null;
      if (finalState && Array.isArray(finalState.messages)) {
          // Find the last *AI* message added by an *agent* (not the router decision)
          for (let i = finalState.messages.length - 1; i >= 0; i--) {
              const msg = finalState.messages[i];
              // Check if it's an AIMessage and not just the router's internal reasoning/decision
              if (msg instanceof AIMessage && typeof msg.content === 'string') {
                  const content = msg.content.trim();
                  // Basic check to avoid returning internal router messages if they leak
                  if (!content.startsWith('{"routingDecision":')) {
                      feedback = content;
                      // Strip reasoning block if present
                      const reasoningEndIndex = feedback.indexOf('</reasoning>');
                      if (reasoningEndIndex !== -1) {
                          feedback = feedback.substring(reasoningEndIndex + '</reasoning>'.length).trim();
                      }
                      // Remove potential quotes
                      if (feedback.startsWith('"') && feedback.endsWith('"')) {
                          feedback = feedback.substring(1, feedback.length - 1);
                      }
                      // Ensure it's not just the END signal
                      if (feedback === END || feedback === '__END__') {
                          feedback = null; // Treat END signal as no feedback
                      }
                      break; // Found the last relevant AI feedback
                  }
              }
          }
      }


      if (feedback) {
        this.logger.log(`Feedback generated: ${feedback.substring(0, 100)}...`);
        return feedback;
      } else {
        this.logger.warn('No valid AI feedback message found in the final state or decision was END.');
        return null;
      }
    } catch (error) {
      this.logger.error('Error during graph invocation:', error);
      this.logger.error('State at time of error:', JSON.stringify(initialState, null, 2));
      throw new Error(`Failed to generate feedback: ${error.message}`);
    }
  }
}

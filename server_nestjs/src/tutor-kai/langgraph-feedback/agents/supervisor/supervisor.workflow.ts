import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { Runnable, RunnableLambda, RunnableConfig } from '@langchain/core/runnables';
import { StateGraph, END, StateGraphArgs, Annotation } from '@langchain/langgraph';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/FeedbackContext.dto';
import { CHAT_OPENAI_MODEL } from '../../langgraph.constants'; // Import token from constants file

// Import Core Agent Builders (needed if graph nodes invoke core agents directly)
import { buildKcCoreAgent } from '../kc/kc.agent';
import { buildKhCoreAgent } from '../kh/kh.agent';
import { buildKmCoreAgent } from '../km/km.agent';
import { buildKtcCoreAgent } from '../ktc/ktc.agent';

// Import Tool Service/Creator (if needed for core agent invocation within graph)
import { DomainKnowledgeService } from '../../tools/domain-knowledge/domain-knowledge.service';
import { createDomainKnowledgeTool } from '../../tools/domain-knowledge/domain-knowledge.tool';

// Import Supervisor Prompt
import { buildSupervisorPrompt } from './supervisor.prompt'; // Assuming prompt file exists here

// --- Graph State Definition (Copied from LanggraphFeedbackService) ---
const AnnotatedState = Annotation.Root({
  inputContext: Annotation<FeedbackContextDto | null>,
  messages: Annotation<BaseMessage[]>,
  studentSolution: Annotation<string>,
  taskDescription: Annotation<string>,
  compilerOutput: Annotation<string | null>,
  unitTestResults: Annotation<any | null>,
  attemptCount: Annotation<number>,
  automatedTests: Annotation<any[] | undefined>,
  codeGerueste: Annotation<any[] | undefined>,
  feedbackOutput: Annotation<string | null>, // This might become redundant if we return messages
  routingDecision: Annotation<string | typeof END | null>,
});
type GraphState = typeof AnnotatedState.State;
type NodeFunction = (state: GraphState) => Promise<Partial<GraphState>>;
type RouterFunction = (state: GraphState) => Promise<Partial<GraphState>>;
type AgentNodeNames = "KC" | "KH" | "KM" | "KTC";
type GraphNodeNames = "router" | "format_input" | AgentNodeNames;
// --- End Graph State Definition ---


@Injectable()
export class SupervisorWorkflowService implements OnModuleInit {
  private readonly logger = new Logger(SupervisorWorkflowService.name);
  private supervisorGraph: Runnable<GraphState, GraphState>;
  private domainKnowledgeTool: DynamicStructuredTool; // Needed if core agents are invoked directly

  constructor(
    @Inject(CHAT_OPENAI_MODEL) private readonly model: ChatOpenAI,
    private readonly configService: ConfigService, // Needed for API key? Or just model?
    // Inject Agent Providers (if invoking full chains) - OR - Tool Services (if invoking core agents)
    private readonly domainKnowledgeService: DomainKnowledgeService, // Needed for tool creation
    // Inject providers if needed, though maybe not if core builders are used directly?
    // private readonly kcAgentProvider: KcAgentProvider,
    // private readonly khAgentProvider: KhAgentProvider,
    // private readonly kmAgentProvider: KmAgentProvider,
    // private readonly ktcAgentProvider: KtcAgentProvider,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Supervisor Workflow Service...');
    try {
      // Instantiate tools needed by core agents if invoked directly
      this.domainKnowledgeTool = createDomainKnowledgeTool(this.domainKnowledgeService);
      this.logger.log('Domain Knowledge Tool instantiated in SupervisorWorkflowService.');

      await this.initializeGraph();
      this.logger.log('Supervisor Workflow Service Initialized Successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize Supervisor Workflow Service:', error);
      throw error;
    }
  }

  private async initializeGraph(): Promise<void> {
    // --- Graph Building Logic (Moved from LanggraphFeedbackService) ---
    const workflow = new StateGraph(AnnotatedState);

    // --- Node: Format Initial Input (Copied) ---
    const formatInitialInputNode: NodeFunction = async (state: GraphState): Promise<Partial<GraphState>> => {
        if (!state.inputContext) {
            throw new Error("Input context is missing in graph state.");
        }
        const input = state.inputContext;
        const contextMessageContent = `
Analyze my solution for the following task. This is attempt number ${input.attemptCount}.
Task Description: ${input.taskDescription}
Provided Code Skeleton(s): ${JSON.stringify(input.codeGerueste) || 'None'}
My Solution:
\`\`\`
${input.studentSolution}
\`\`\`
Compiler Output: ${input.compilerOutput || 'None'}
Automated Tests Definition: ${JSON.stringify(input.automatedTests) || 'None'}
Unit Test Results: ${JSON.stringify(input.unitTestResults) || 'None'}
`;
        const initialMessages: BaseMessage[] = [new HumanMessage(contextMessageContent)];
        return {
            messages: initialMessages,
            studentSolution: input.studentSolution,
            taskDescription: input.taskDescription,
            compilerOutput: input.compilerOutput,
            unitTestResults: input.unitTestResults,
            attemptCount: input.attemptCount,
            automatedTests: input.automatedTests,
            codeGerueste: input.codeGerueste,
        };
    };

    // --- Agent Node Wrappers (Copied - Uses Core Agents) ---
    const wrapAgentNode = (agentRunnable: Runnable<any, any>): RunnableLambda<GraphState, Partial<GraphState>> => {
        const nodeFunc: NodeFunction = async (state: GraphState): Promise<Partial<GraphState>> => {
            const agentInput = { messages: state.messages }; // Input for core agent
            try {
                // Invoke the core agent runnable
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

    // --- Create Core Agent Runnables (Using Builders) ---
    const knowledgeAboutConceptsAgentRunnable = buildKcCoreAgent(this.model, [this.domainKnowledgeTool]);
    const knowledgeOnHowToProceedAgentRunnable = buildKhCoreAgent(this.model);
    const knowledgeAboutMistakesAgentRunnable = buildKmCoreAgent(this.model);
    const knowledgeAboutTaskConstraintsAgentRunnable = buildKtcCoreAgent(this.model);

    // --- Wrap Agent Nodes (Using Core Runnables) ---
    const kcNode = wrapAgentNode(knowledgeAboutConceptsAgentRunnable);
    const khNode = wrapAgentNode(knowledgeOnHowToProceedAgentRunnable);
    const kmNode = wrapAgentNode(knowledgeAboutMistakesAgentRunnable);
    const ktcNode = wrapAgentNode(knowledgeAboutTaskConstraintsAgentRunnable);

    // --- Router Logic (Copied) ---
    const supervisorPromptString = buildSupervisorPrompt();
    const routerFunction: RouterFunction = async (state: GraphState): Promise<Partial<GraphState>> => {
        this.logger.log('Router: Deciding next agent...');
        const { messages } = state; // Only need messages from state now for this part

        // Find the initial HumanMessage containing the context
        const humanMessage = messages.find(msg => msg instanceof HumanMessage);
        if (!humanMessage) {
            this.logger.error('Router: Could not find HumanMessage in state.');
            return { routingDecision: END }; // Cannot proceed without context
        }

        // Find the last AI message for feedback history
        const lastFeedback = messages.filter(msg => msg instanceof AIMessage).pop()?.content?.toString() || 'None';

        // Get the base system prompt (assuming context placeholders are removed)
        // Replace only the {lastFeedback} placeholder if it exists in the prompt
        const systemPromptContent = supervisorPromptString.replace('{lastFeedback}', lastFeedback);
        const systemMessage = new SystemMessage(systemPromptContent);

        // Prepare messages for the LLM call
        const llmMessages: BaseMessage[] = [ systemMessage, humanMessage ];

        this.logger.log(`Router: Sending System and Human messages to LLM.`);
        this.logger.log(`Router: System Prompt (first 200 chars): ${systemPromptContent.substring(0, 200)}...`);
        this.logger.log(`Router: Human Message (first 200 chars): ${humanMessage.content.toString().substring(0, 200)}...`);

        try {
            // Invoke the model with both System and Human messages
            const response = await this.model.invoke(llmMessages);
            let decision = response.content.toString().trim();
            if (decision.startsWith('"') && decision.endsWith('"')) {
                decision = decision.substring(1, decision.length - 1);
            }
            this.logger.log(`Router: LLM decision: '${decision}'`);
            const validAgents: AgentNodeNames[] = ['KC', 'KH', 'KM', 'KTC'];
            if (validAgents.includes(decision as AgentNodeNames)) {
                return { routingDecision: decision };
            } else if (decision === END || decision === '__END__') {
                return { routingDecision: END };
            } else {
                const reasoningMatch = response.content.toString().match(/<\/reasoning>\s*"?(\w+|__END__)?"?/);
                if (reasoningMatch && reasoningMatch[1]) {
                    const extractedDecision = reasoningMatch[1];
                    this.logger.warn(`Router: Extracted decision '${extractedDecision}' from reasoning block.`);
                    if (validAgents.includes(extractedDecision as AgentNodeNames)) return { routingDecision: extractedDecision };
                    if (extractedDecision === END || extractedDecision === '__END__') return { routingDecision: END };
                }
                this.logger.warn(`Router: Invalid or unparseable decision '${decision}'. Defaulting to END.`);
                return { routingDecision: END };
            }
        } catch (error) {
            this.logger.error(`Error invoking router LLM: ${error}`);
            return { routingDecision: END };
        }
    };

    // --- Add Nodes and Edges (Copied) ---
    workflow.addNode('format_input', formatInitialInputNode);
    workflow.addNode('KC', kcNode);
    workflow.addNode('KH', khNode);
    workflow.addNode('KM', kmNode);
    workflow.addNode('KTC', ktcNode);
    workflow.addNode('router', routerFunction);

    // @ts-ignore
    workflow.addEdge("__start__", "format_input");
    // @ts-ignore
    workflow.addEdge("format_input", "router");

    const routeLogic = (state: GraphState): AgentNodeNames | "__end__" => {
        const decision = state.routingDecision;
        if (!decision || decision === END) return "__end__";
        return decision as AgentNodeNames;
    };

    // @ts-ignore
    workflow.addConditionalEdges('router', routeLogic, {
        'KC': 'KC', 'KH': 'KH', 'KM': 'KM', 'KTC': 'KTC', "__end__": END
    });

    // @ts-ignore
    workflow.addEdge('KC', "__end__");
    // @ts-ignore
    workflow.addEdge('KH', "__end__");
    // @ts-ignore
    workflow.addEdge('KM', "__end__");
    // @ts-ignore
    workflow.addEdge('KTC', "__end__");

    // --- Compile Graph ---
    this.supervisorGraph = workflow.compile();
    this.logger.log('Supervisor graph compiled.');
    // --- End Graph Building Logic ---
  }

  /**
   * Invokes the supervisor workflow with the given context.
   * @param contextInput The feedback context DTO.
   * @returns The final state of the graph. // TODO: Define a clearer return type (e.g., just the feedback message)
   */
  async invokeWorkflow(contextInput: FeedbackContextDto): Promise<GraphState> { // Returning full state for now
    this.logger.log(`Invoking supervisor workflow for attempt ${contextInput.attemptCount}`);
    if (!this.supervisorGraph) {
      this.logger.error('Supervisor graph is not initialized.');
      throw new Error('Supervisor workflow service not ready.');
    }

    const initialState: Partial<GraphState> = {
        inputContext: contextInput,
        messages: [],
        studentSolution: '',
        taskDescription: '',
        compilerOutput: null,
        unitTestResults: null,
        attemptCount: contextInput.attemptCount,
        automatedTests: undefined,
        codeGerueste: undefined,
        feedbackOutput: null,
        routingDecision: null,
    };

    try {
      const config: RunnableConfig = { recursionLimit: 50 };
      const finalState = await this.supervisorGraph.invoke(initialState as GraphState, config);
      this.logger.log('Supervisor workflow execution completed.');
      // TODO: Extract specific feedback message from finalState.messages if needed
      return finalState;
    } catch (error) {
      this.logger.error('Error during supervisor workflow invocation:', error);
      this.logger.error('Initial state at time of error:', JSON.stringify(initialState, null, 2));
      throw new Error(`Failed to execute supervisor workflow: ${error.message}`);
    }
  }
}

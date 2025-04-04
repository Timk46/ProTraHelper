import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'; // Added AIMessage
import { Runnable } from '@langchain/core/runnables';
import { StateGraph, END } from '@langchain/langgraph';
import { createSupervisor } from '@langchain/langgraph-supervisor';
import * as fs from 'fs/promises';
import * as path from 'path';

import {
  FeedbackGraphState,
  zodSchema,
  State,
} from './langgraph-feedback.state';
// Import remaining agents
import { knowledgeAboutMistakesAgent } from './agents/km/km.agent';
import { knowledgeOnHowToProceedAgent } from './agents/kh/kh.agent';
import { knowledgeAboutConceptsAgent } from './agents/kc/kc.agent';
import { knowledgeAboutTaskConstraintsAgent } from './agents/ktc/ktc.agent';
// Import tools
import { DomainKnowledgeService } from './tools/domain-knowledge/domain-knowledge.service';
import { createDomainKnowledgeTool } from './tools/domain-knowledge/domain-knowledge.tool';
import { DynamicTool } from '@langchain/core/tools';
// Import the helper function directly
import { createFeedbackAgent } from './agents/agent.common';

@Injectable()
export class LanggraphFeedbackService implements OnModuleInit {
  private readonly logger = new Logger(LanggraphFeedbackService.name);
  private feedbackGraph: any;
  private domainKnowledgeService: DomainKnowledgeService; // Instance of the tool service
  private domainKnowledgeTool: DynamicTool; // Instance of the tool

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Initializing Langgraph Feedback Service...');
    try {
      await this.initializeGraph();
      this.logger.log('Langgraph Feedback Service Initialized Successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize Langgraph Feedback Service:', error);
      // Depending on the application's needs, you might want to throw the error
      // or handle it to allow the application to start in a degraded state.
      throw error;
    }
  }

  private async initializeGraph(): Promise<void> {
    const openAIApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    // Instantiate Tool Service and Tool
    // TODO: Replace with proper NestJS dependency injection
    // Ensure DomainKnowledgeService is properly initialized before creating the tool
    this.domainKnowledgeService = new DomainKnowledgeService(this.configService);
    await this.domainKnowledgeService.onModuleInit(); // Manually trigger init as it's not managed by NestJS DI here
    if (!this.domainKnowledgeService['vectorStore']) { // Check if vectorStore initialized (crude check)
        this.logger.warn('DomainKnowledgeService vector store failed to initialize. Tool may not work.');
        // Decide how to handle this - throw error? Proceed without tool?
    }
    this.domainKnowledgeTool = createDomainKnowledgeTool(this.domainKnowledgeService);
    this.logger.log('Domain Knowledge Tool created.');

    const model = new ChatOpenAI({
      modelName: 'gpt-4o', // Consider making this configurable
      apiKey: openAIApiKey,
      temperature: 0.2, // Lower temperature for more deterministic routing
    });

    // Define the list of the four active feedback agents
    const activeFeedbackAgents = [
      knowledgeAboutMistakesAgent,
      knowledgeOnHowToProceedAgent,
      knowledgeAboutConceptsAgent, // This instance will be replaced by kcAgentWithTool below
      knowledgeAboutTaskConstraintsAgent,
    ];

    // Re-create the KC agent instance here to bind the specific tool instance created above.
    // This is needed because the imported 'knowledgeOfConceptAgent' is static.
    // TODO: Refactor using NestJS providers/factories for cleaner dependency management.
    const kcAgentPrompt = `You are the Knowledge of Concept (KC) agent.
   Based on the student's code, the task, and the errors provided in the message history, identify the core programming concept the student seems to be misunderstanding.
   Use the 'search_domain_knowledge' tool to fetch relevant explanations from lecture materials if needed.
   Explain the concept clearly and concisely in the context of the task.
   Do not provide code solutions. Focus on the conceptual explanation.
   Respond only with the concept explanation.`; // Re-define or import KC prompt
    const kcAgentWithTool = createFeedbackAgent( // Use the directly imported helper
        'KC',
        kcAgentPrompt,
        [this.domainKnowledgeTool] // Pass the tool instance
    );

    // Update the list passed to the supervisor, ensuring only the 4 active agents are included
    // and the KC agent instance has the tool bound.
    const agentsForSupervisor = activeFeedbackAgents.map(agent =>
        agent.name === 'KC' ? kcAgentWithTool : agent // Replace the imported KC with the tool-equipped one
    );

    // Load the supervisor prompt from its new location
    const promptPath = path.join(
      __dirname, // Be cautious with __dirname in NestJS builds, consider relative paths or asset handling
      'supervisor',
      'supervisor.prompt.txt',
    );
    let supervisorPromptTemplate: string;
    try {
      supervisorPromptTemplate = await fs.readFile(promptPath, 'utf-8');
      this.logger.log(`Supervisor prompt loaded from ${promptPath}`);
    } catch (error) {
      this.logger.error(`Failed to load supervisor prompt from ${promptPath}`, error);
      throw new Error(`Failed to load supervisor prompt: ${error.message}`);
    }

    // Create the supervisor workflow
    // Note: createSupervisor expects agent functions directly, not objects with names.
    // The names are passed separately if needed or inferred. Let's adjust based on typical usage.
    // We pass agent functions and rely on the prompt to map decisions to function calls.
    // Rely on stateSchema for type inference, remove explicit generic
    // Pass the array of { name, agent } objects directly
    // Remove stateSchema, rely on inference
    const supervisorWorkflow = createSupervisor({
      llm: model,
      agents: agentsForSupervisor, // Pass the final list of 4 agents
      prompt: supervisorPromptTemplate, // Pass the loaded prompt template string
      // entryNode: undefined, // Default entry is supervisor
      // exitNode: END // Default exit is END when supervisor returns __END__
    });

    // Compile the graph
    this.feedbackGraph = supervisorWorkflow.compile();
    this.logger.log('Feedback graph compiled.');
  }

  /**
   * Processes a student's submission and returns adaptive feedback.
   * (Implementation to be added)
   * @param studentSolution The student's code.
   * @param taskDescription The description of the task.
   * @param compilerOutput Optional compiler output.
   * @param unitTestResults Optional unit test results.
   * @param attemptCount The current attempt number.
   * @returns The generated feedback string.
   */
  async getFeedback(
    studentSolution: string,
    taskDescription: string,
    compilerOutput: string | null,
    unitTestResults: any | null,
    attemptCount: number,
  ): Promise<string | null> {
    this.logger.log(`Getting feedback for attempt ${attemptCount}`);

    if (!this.feedbackGraph) {
      this.logger.error(
        'Feedback graph is not initialized. Cannot process request.',
      );
      throw new Error('Feedback service not ready.');
    }

    // Construct the initial human message containing all context for the supervisor/agents
    const contextMessageContent = `
      Analyze my solution for the following task. This is attempt number ${attemptCount}.

      Task Description:
      ${taskDescription}

      My Solution:
      \`\`\`
      ${studentSolution}
      \`\`\`

      Compiler Output:
      ${compilerOutput || 'None'}

      Unit Test Results:
      ${JSON.stringify(unitTestResults) || 'None'}
    `;

    // Initialize the state for the graph invocation
    const initialState: State = {
      messages: [new HumanMessage(contextMessageContent)], // Pass context in the first message
      // Other state fields are implicitly managed or not directly needed by createReactAgent structure
      // Keep required fields from Zod schema if not covered by messages
      studentSolution, // Keep for potential direct access if needed elsewhere
      taskDescription, // Keep for potential direct access
      compilerOutput, // Keep for potential direct access
      unitTestResults, // Keep for potential direct access
      attemptCount, // Keep for potential direct access
      feedbackOutput: null, // Initialize feedback output
    };

    try {
      // Invoke the graph - the input format for createReactAgent/Supervisor
      // typically expects just the messages array in an object.
      // Let's adjust the invoke call based on common patterns.
      const invokeInput = { messages: initialState.messages };
      const finalState = await this.feedbackGraph.invoke(invokeInput);

      this.logger.log('Graph execution completed.');

      // Extract the final feedback. The supervisor/agent should add an AIMessage.
      // We look for the last AIMessage added by our agents/supervisor.
      let feedback: string | null = null;
      if (finalState && Array.isArray(finalState.messages)) {
          // Find the last AI message in the history
          for (let i = finalState.messages.length - 1; i >= 0; i--) {
              const msg = finalState.messages[i];
              if (msg instanceof AIMessage) {
                  // Check if content is string and not empty
                  if (typeof msg.content === 'string' && msg.content.trim().length > 0) {
                      feedback = msg.content.trim();
                      break; // Found the last relevant AI feedback
                  }
              }
          }
      }

      if (feedback) {
        this.logger.log(`Feedback generated: ${feedback.substring(0, 100)}...`);
        return feedback;
      } else {
        this.logger.warn('No valid AI feedback message found in the final state.');
        return null; // Or return a default "No feedback available" message
      }
    } catch (error) {
      this.logger.error('Error during graph invocation:', error);
      // Consider more specific error handling or logging
      throw new Error(`Failed to generate feedback: ${error.message}`);
    }
  }
}

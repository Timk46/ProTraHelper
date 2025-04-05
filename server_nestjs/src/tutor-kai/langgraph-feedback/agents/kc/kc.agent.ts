import { ChatOpenAI } from '@langchain/openai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/FeedbackContext.dto'; // Keep this if needed for parsing input
import { TranscriptChunk } from '@DTOs/index'; // Needed for processing tool output
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from '@langchain/core/messages';
import {
  Runnable,
  RunnableLambda,
  RunnableConfig,
} from '@langchain/core/runnables';
import { StateGraph, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt'; // Use ToolNode for standard tool execution
import {
  getConceptsPrompt,
  generateFeedbackPrompt,
} from './kc.prompts';


// --- Graph State Definition ---
interface KcGraphState {
  messages: BaseMessage[]; // Message history
  inputContext: FeedbackContextDto | null; // Store the initial context
  toolCalls?: any[]; // Store LLM tool call requests (parsed from AIMessage)
  lectureSnippets?: string; // Formatted snippets for Prompt B
  sourceMap?: Record<string, string>; // Map for $$Zahl$$ replacement
  finalFeedback?: string; // The final processed feedback string
  feedbackLevel?: string; // Store the determined feedback level
}

// Helper function to extract context (adapt as needed based on actual input structure)
// NOTE: This function makes many assumptions about the HumanMessage content
// and the FeedbackContextDto structure. It needs careful validation.
function parseInitialContext(messages: BaseMessage[]): { context: FeedbackContextDto | null} {
    const humanMessage = messages.find((msg) => msg instanceof HumanMessage);
    if (!humanMessage || typeof humanMessage.content !== 'string') {
        console.error("KC Agent: Could not find valid HumanMessage in input.");
        return { context: null };
    }

    try {
        const content = humanMessage.content;
        // Attempt to parse context details from the message content
        const taskMatch = content.match(/Task Description: (.*?)\n/);
        const codeMatch = content.match(/My Solution:\n\`\`\`\n([\s\S]*?)\n\`\`\`/);
        const compilerMatch = content.match(/Compiler Output: (.*?)\n/);
        const testsMatch = content.match(/Automated Tests Definition: (.*?)\n/);
        const resultsMatch = content.match(/Unit Test Results: (.*?)\n/);
        const attemptMatch = content.match(/This is attempt number (\d+)\./);
        const skeletonMatch = content.match(/Provided Code Skeleton\(s\): (.*?)\n/);

        // Reconstruct a partial DTO based on parsed info.
        // This might be incomplete or inaccurate depending on the actual DTO.
        const context: Partial<FeedbackContextDto> = { // Use Partial<> as we might not have all fields
            taskDescription: taskMatch ? taskMatch[1].trim() : '',
            studentSolution: codeMatch ? codeMatch[1].trim() : '',
            compilerOutput: compilerMatch ? compilerMatch[1].trim() : 'None',
            // Safely parse JSON, default to undefined/null on error
            automatedTests: testsMatch ? tryParseJson(testsMatch[1], undefined) : undefined,
            unitTestResults: resultsMatch ? tryParseJson(resultsMatch[1], null) : null,
            attemptCount: attemptMatch ? parseInt(attemptMatch[1], 10) : 1,
            codeGerueste: skeletonMatch ? tryParseJson(skeletonMatch[1], undefined) : undefined,
            // Note: feedbackLevel is handled separately in the graph state, not part of the DTO context here.
            // Fields from the original context that might be needed by prompts but aren't in the DTO:
            // questionId: 0, // Example
            // flavor: '', // Example
            // userId: 0, // Example
        };

        // We return the partial context and the level separately
        return { context: context as FeedbackContextDto }; // Cast back, acknowledging potential incompleteness
    } catch (e) {
        console.error("KC Agent: Failed to parse context from HumanMessage:", e);
        return { context: null };
    }
}

// Helper to safely parse JSON
function tryParseJson(jsonString: string | null | undefined, defaultValue: any): any {
    if (!jsonString) return defaultValue;
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.warn("Failed to parse JSON:", jsonString, e);
        return defaultValue;
    }
}


/**
 * Node: Identifies concepts and requests tool usage using Prompt A.
 */
const identifyConceptsAndRequestTool = async (
  state: KcGraphState,
  config?: RunnableConfig,
): Promise<Partial<KcGraphState>> => {
  console.log('--- KC Node: identifyConceptsAndRequestTool ---');
  const { context } = parseInitialContext(state.messages); // Context here is potentially partial
  if (!context) {
    return { messages: [...state.messages, new AIMessage("Error: Could not parse input context.")] };
  }

  // Determine programming language (using placeholder for now)
  const programmingLanguage = 'C++'; // <<<--- PLACEHOLDER / NEEDS IMPLEMENTATION

  // Format the prompt directly into messages
  const messagesA = await getConceptsPrompt.formatMessages({
    task: context.taskDescription ?? '',
    language: programmingLanguage,
    code: context.studentSolution ?? '',
    output: context.compilerOutput ?? 'Es liegt kein Output vor.',
    unitTests: context.automatedTests ? JSON.stringify(context.automatedTests) : 'Es liegen keine Unit-Tests vor.',
    unitTestsResults: context.unitTestResults ? JSON.stringify(context.unitTestResults) : 'Es liegen keine Testergebnisse vor.',
  });

  const llm = config?.configurable?.llm as ChatOpenAI;
  if (!llm) throw new Error("LLM not found in config");

  // Bind tools for the LLM call
  const llmWithTools = llm.bind({
      tools: config?.configurable?.tools,
  });

  // Invoke LLM and get the AIMessage response
  const response = await llmWithTools.invoke(messagesA, config);

  // Extract tool calls from the AIMessage
  // Langchain AIMessage stores tool calls in `tool_calls` property
  const toolCalls = response?.tool_calls ?? [];

  console.log("Tool calls requested:", JSON.stringify(toolCalls, null, 2));

  // Add the AIMessage (which includes tool_calls) to the state
  return {
    messages: [...state.messages, response], // Add the actual AIMessage
    toolCalls: toolCalls, // Store parsed tool calls for conditional edge
  };
};

/**
 * Node: Processes the output of the domainKnowledgeTool.
 * Creates the lectureSnippet string and sourceMap.
 */
const processToolResults = async (
  state: KcGraphState,
): Promise<Partial<KcGraphState>> => {
    console.log('--- KC Node: processToolResults ---');
    const lastMessage = state.messages[state.messages.length - 1];

    // Ensure the last message is a ToolMessage
    if (!(lastMessage instanceof ToolMessage)) {
        console.warn("processToolResults: Last message is not a ToolMessage. Skipping.");
        // If no tool was called, lectureSnippets should be empty/default
        return { lectureSnippets: "[]", sourceMap: {} };
    }

    let toolOutput: TranscriptChunk[] = [];
    try {
        let parsedContent: any;
        // ToolMessage content might be stringified JSON or the direct object/array
        if (typeof lastMessage.content === 'string') {
            parsedContent = JSON.parse(lastMessage.content);
        } else {
            parsedContent = lastMessage.content; // Assume it's already the object/array
        }

        // Validate that the parsed content is an array
        if (!Array.isArray(parsedContent)) {
             throw new Error(`Parsed tool output is not an array. Type: ${typeof parsedContent}`);
        }

        // Further validation: Check if elements look like TranscriptChunk
        if (parsedContent.length > 0) {
            const firstElement = parsedContent[0];
            if (typeof firstElement !== 'object' || firstElement === null ||
                typeof firstElement.TranscriptChunkContent !== 'string' ||
                typeof firstElement.metadata !== 'object' || firstElement.metadata === null ||
                typeof firstElement.metadata.markdownLink !== 'string') {
                 throw new Error("Parsed array elements do not match TranscriptChunk structure.");
            }
        }
        // If validation passes, cast and assign
        toolOutput = parsedContent as TranscriptChunk[];

    } catch (e) {
        console.error("Error processing ToolMessage content:", e);
        console.error("ToolMessage content was:", lastMessage.content);
        // Handle error - provide empty defaults
        return { lectureSnippets: "[]", sourceMap: {} };
    }

    // Logic adapted from original FeedbackRAGService to build conceptString and sourceMapDict
    let concepts = [];
    let sourceCounter = 0;
    let sourceMapDict: Record<string, string> = {};

    let explanations = [];
    for (const chunk of toolOutput) {
        // Ensure required fields exist before processing
        if (chunk.TranscriptChunkContent && chunk.metadata?.markdownLink) {
            sourceCounter++;
            explanations.push({
                Erklärung: chunk.TranscriptChunkContent,
                Quelle: `$$${sourceCounter}$$`, // Placeholder for citation
            });
            // Store the actual link in the map
            sourceMapDict[sourceCounter.toString()] = chunk.metadata.markdownLink;
        } else {
             console.warn("Skipping transcript chunk due to missing content or markdownLink:", chunk);
        }
    }
    // Structure for the prompt (simplified as one concept group)
    concepts.push({
        Konzept: "Relevante Vorlesungsinhalte", // Generic concept name for the prompt
        Inhalte: explanations,
    });

    const conceptString = JSON.stringify({ Vorlesungsausschnitte: concepts });

    return {
        lectureSnippets: conceptString,
        sourceMap: sourceMapDict,
    };
};


/**
 * Node: Generates the final feedback using Prompt B and processed snippets.
 */
const generateFeedback = async (
  state: KcGraphState,
  config?: RunnableConfig,
): Promise<Partial<KcGraphState>> => {
  console.log('--- KC Node: generateFeedback ---');
  // Use the feedbackLevel stored in the state from the initial parsing/wrapper
  const level = state.feedbackLevel;
  const context = state.inputContext; // Use context stored in state

  if (!context) {
      // This shouldn't happen if initial parsing worked, but handle defensively
      return { messages: [...state.messages, new AIMessage("Error: Input context missing for final feedback generation.")] };
  }


  // Determine programming language (using placeholder)
  const programmingLanguage = 'C++'; // <<<--- PLACEHOLDER / NEEDS IMPLEMENTATION

  // Format the prompt directly into messages
  const messagesB = await generateFeedbackPrompt.formatMessages({
    task: context.taskDescription ?? '',
    language: programmingLanguage,
    code: context.studentSolution ?? '',
    output: context.compilerOutput ?? 'Es liegt kein Output vor.',
    unitTests: context.automatedTests ? JSON.stringify(context.automatedTests) : 'Es liegen keine Unit-Tests vor.',
    unitTestsResults: context.unitTestResults ? JSON.stringify(context.unitTestResults) : 'Es liegen keine Testergebnisse vor.',
    lectureSnippet: state.lectureSnippets || '[]', // Use processed snippets
  });

  const llm = config?.configurable?.llm as ChatOpenAI;
  if (!llm) throw new Error("LLM not found in config");

  const response = await llm.invoke(messagesB, config);
  const rawFeedback = response.content.toString();

  // Add raw feedback message to history for the next node
  return { messages: [...state.messages, new AIMessage(rawFeedback)] };
};

/**
 * Node: Processes the raw feedback to replace $$Zahl$$ citations.
 */
const processFeedbackCitations = async (
  state: KcGraphState,
): Promise<Partial<KcGraphState>> => {
    console.log('--- KC Node: processFeedbackCitations ---');
    const lastMessage = state.messages[state.messages.length - 1];
    const sourceMap = state.sourceMap ?? {};

    if (!(lastMessage instanceof AIMessage) || typeof lastMessage.content !== 'string') {
        console.warn("processFeedbackCitations: Last message is not an AIMessage with string content.");
        // Attempt to return the last content anyway, or a default error
        const fallbackContent = state.messages[state.messages.length - 1]?.content?.toString() ?? "Error: Could not process feedback citations.";
        return { finalFeedback: fallbackContent };
    }

    let processedFeedback = lastMessage.content;

    // Replace $$Zahl$$ with markdown links using the sourceMap
    processedFeedback = processedFeedback.replace(/\$\$([0-9]+)\$\$/g, (match, numberStr) => {
        const link = sourceMap[numberStr];
        if (link) {
            // console.log(`Replacing $$${numberStr}$$ with ${link}`); // Verbose logging
            return link;
        } else {
            console.warn(`No link found in sourceMap for $$${numberStr}$$`);
            return match; // Keep original placeholder if no link found
        }
    });

    console.log("Final Processed Feedback:", processedFeedback.substring(0, 200) + "..."); // Log truncated
    // Update the finalFeedback field in the state
    return { finalFeedback: processedFeedback };
};


// --- Conditional Edge Logic ---
const shouldInvokeTool = (state: KcGraphState): "invokeTool" | "generateFeedback" => {
  console.log('--- KC Edge: shouldInvokeTool ---');
  // Check the toolCalls field populated by identifyConceptsAndRequestTool node
  if (state.toolCalls && state.toolCalls.length > 0) {
    console.log("Decision: invokeTool");
    return "invokeTool";
  }
  console.log("Decision: generateFeedback (no tool calls)");
  // If no tool calls, clear any potential stale lecture snippets/source map
  return "generateFeedback";
};


/**
 * Builds the core KC agent runnable using the new custom graph.
 * This function is called by the supervisor.
 * @param llm The ChatOpenAI model instance.
 * @param tools An array of tools the agent can use (should include domainKnowledgeTool).
 * @returns A Runnable representing the core KC agent graph.
 */
export function buildKcCoreAgent(llm: ChatOpenAI, tools: DynamicStructuredTool[]): Runnable<any, any> {
    console.log("Building KC Core Agent with tools:", tools.map(t => t.name));
    // Correct the tool name check to match what the supervisor provides
    const domainKnowledgeTool = tools.find(t => t.name === 'search_domain_knowledge');
    if (!domainKnowledgeTool) {
        // If the tool isn't strictly required (e.g., feedback can be generated without it),
        // maybe log a warning instead of throwing an error. But based on the prompts, it seems necessary.
        throw new Error("buildKcCoreAgent requires 'search_domain_knowledge' to be provided in the tools array."); // Updated error message too
    }

    // Define the graph structure
    const workflow = new StateGraph<KcGraphState>({
        channels: {
            messages: { value: (x, y) => x.concat(y), default: () => [] },
            inputContext: { value: (x, y) => y ?? x, default: () => null },
            toolCalls: { value: (x, y) => y ?? x }, // Store parsed tool calls
            lectureSnippets: { value: (x, y) => y ?? x, default: () => "[]" }, // Default to empty JSON array string
            sourceMap: { value: (x, y) => y ?? x, default: () => ({}) }, // Default to empty object
            finalFeedback: { value: (x, y) => y ?? x },
            feedbackLevel: { value: (x, y) => y ?? x },
        },
    });

    // Add nodes
    workflow.addNode("identifyConcepts", identifyConceptsAndRequestTool);
    // Ensure ToolNode receives the correct tools it might be called with
    const toolNode = new ToolNode(tools);
    workflow.addNode("invokeTool", toolNode); // Standard LangGraph ToolNode
    workflow.addNode("processToolResults", processToolResults); // Custom node to process ToolNode output
    workflow.addNode("generateFeedback", generateFeedback);
    workflow.addNode("processFeedbackCitations", processFeedbackCitations); // Custom node to process citations

    // Define edges using @ts-ignore to bypass strict literal type checks
    // @ts-ignore
    workflow.setEntryPoint("identifyConcepts");

    // @ts-ignore
    workflow.addConditionalEdges("identifyConcepts", shouldInvokeTool, {
        invokeTool: "invokeTool",
        generateFeedback: "generateFeedback", // Skip tool invocation if no calls requested
    });

    // @ts-ignore
    workflow.addEdge("invokeTool", "processToolResults"); // Process results *after* ToolNode runs
    // @ts-ignore
    workflow.addEdge("processToolResults", "generateFeedback"); // Always generate feedback after processing (even if empty)
    // @ts-ignore
    workflow.addEdge("generateFeedback", "processFeedbackCitations"); // Process citations in the generated feedback
    // @ts-ignore
    workflow.addEdge("processFeedbackCitations", END); // End after processing citations

    // Compile the graph
    const graph = workflow.compile();

    // Create the wrapper RunnableLambda to match supervisor expectations
    const agentRunnable = new RunnableLambda({
        func: async (input: { messages: BaseMessage[] }, config?: RunnableConfig) => {
            console.log("--- KC Agent Runnable Wrapper: Invoked ---");
            if (!input || !Array.isArray(input.messages) || input.messages.length === 0) {
                console.error("KC Agent Wrapper: Invalid or empty input messages:", input);
                return { messages: [new AIMessage("Error: Invalid input format for KC agent.")] };
            }

            // Attempt to parse context and feedback level from the initial message
            const { context } = parseInitialContext(input.messages);
            if (!context) {
                 console.error("KC Agent Wrapper: Failed to parse context from input messages.");
                 // Return error message if context parsing fails
                 return { messages: [new AIMessage("Error: Failed to parse context in KC agent wrapper.")] };
            }

            const initialState: KcGraphState = {
                messages: input.messages, // Start with the input message history
                inputContext: context, // Store the parsed (potentially partial) context
                // Initialize other state fields to default/empty
                toolCalls: [],
                lectureSnippets: "[]",
                sourceMap: {},
                finalFeedback: undefined,
            };

            // Prepare config for the graph, passing LLM and Tools
            // Ensure tools are correctly passed in the config for nodes that need them
            const graphConfig: RunnableConfig = {
                ...config,
                recursionLimit: config?.recursionLimit ?? 50, // Set recursion limit
                configurable: {
                    ...(config?.configurable ?? {}),
                    llm: llm, // Make LLM available via config
                    tools: tools, // Make Tools available via config
                },
            };

            try {
                console.log("--- KC Agent Runnable Wrapper: Invoking graph ---");
                const finalState = await graph.invoke(initialState, graphConfig);
                console.log("--- KC Agent Runnable Wrapper: Graph finished ---");

                // Return the final processed feedback in the expected format
                const finalMessageContent = finalState.finalFeedback ?? "Error: No feedback generated or processed.";
                const finalMessage = new AIMessage({ content: finalMessageContent });
                // The supervisor expects the state to be returned, specifically the messages array
                // We replace the history with just the final message for the supervisor wrapper node.
                // return { messages: [finalMessage] }; // Original thought - might be wrong based on supervisor wrapAgentNode
                // Let's return the full final state messages for now, the wrapper might handle it.
                // The supervisor's wrapAgentNode expects { messages: agentOutput?.messages ?? [] }
                // So the graph should return the final message list in the state.
                // The processFeedbackCitations node updates finalFeedback, not messages. Let's fix that.
                // --- Correction: processFeedbackCitations should update the last message ---
                // --- OR: The wrapper should construct the final message from finalFeedback ---
                // Let's modify the wrapper to construct the final message:
                 return { messages: [new AIMessage({ content: finalState.finalFeedback ?? "Error: No feedback generated." })] };

            } catch (error) {
                 console.error("--- KC Agent Runnable Wrapper: Error invoking graph ---", error);
                 return { messages: [new AIMessage(`Error during KC agent execution: ${error.message}`)] };
            }
        },
    }).withConfig({ runName: 'KC Agent' });

    return agentRunnable;
}

// buildKcAgentChain is removed as it's not used by the supervisor

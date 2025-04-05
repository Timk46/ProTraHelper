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

// parseInitialContext and tryParseJson removed as context is now passed directly.


/**
 * Node: Identifies concepts and requests tool usage using Prompt A.
 */
const identifyConceptsAndRequestTool = async (
  state: KcGraphState,
  config?: RunnableConfig,
): Promise<Partial<KcGraphState>> => {
  console.log('--- KC Node: identifyConceptsAndRequestTool ---');
  const context = state.inputContext; // Use context directly from state
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
        // ToolMessage content might be stringified JSON, the direct object/array, or a plain string
        if (typeof lastMessage.content === 'string') {
            try {
                // Attempt to parse if it's a string
                parsedContent = JSON.parse(lastMessage.content);
            } catch (parseError) {
                // If JSON parsing fails, it's likely a plain string response from the tool
                console.warn("ToolMessage content is a string but not valid JSON. Treating as empty result.", parseError);
                console.warn("ToolMessage string content was:", lastMessage.content);
                // Set parsedContent to an empty array to skip processing below
                parsedContent = [];
            }
        } else {
            // Assume it's already the object/array if not a string
            parsedContent = lastMessage.content;
        }

        // Validate that the parsed content is an array (could be empty array now if parsing failed)
        if (!Array.isArray(parsedContent)) {
             // This case should be less likely now, but keep validation
             console.error(`Processed tool output is not an array. Type: ${typeof parsedContent}. Content:`, parsedContent);
             // Provide empty defaults if not an array
             return { lectureSnippets: "[]", sourceMap: {} };
        }

        // Further validation: Check if elements look like TranscriptChunk (only if array is not empty)
        if (parsedContent.length > 0) {
            const firstElement = parsedContent[0];
            // Add null/undefined checks for safety
            if (typeof firstElement !== 'object' || firstElement === null ||
                typeof firstElement.TranscriptChunkContent !== 'string' ||
                typeof firstElement.metadata !== 'object' || firstElement.metadata === null ||
                typeof firstElement.metadata.markdownLink !== 'string') {
                 console.error("Parsed array elements do not match TranscriptChunk structure:", firstElement);
                 // Treat as empty if structure is wrong
                 return { lectureSnippets: "[]", sourceMap: {} };
            }
             // If validation passes, cast and assign
             toolOutput = parsedContent as TranscriptChunk[];
        } else {
            // If parsedContent is an empty array (e.g., due to parse error), toolOutput remains empty
            toolOutput = [];
        }

    } catch (e) {
        // Catch any unexpected errors during processing/validation
        console.error("Unexpected error processing ToolMessage content:", e);
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
        // Input now includes the context DTO directly
        func: async (input: { messages: BaseMessage[], context: FeedbackContextDto }, config?: RunnableConfig) => {
            console.log("--- KC Agent Runnable Wrapper: Invoked ---");
            // Validate both messages and context in the input
            if (!input || !input.context || !Array.isArray(input.messages)) { // Check context existence
                console.error("KC Agent Wrapper: Invalid input format (missing messages or context):", input);
                return { messages: [new AIMessage("Error: Invalid input format for KC agent.")] };
            }

            // Context is now passed directly in the input object
            const context = input.context;
            // Basic check if context object exists (already done in initial check, but good practice)
            if (!context) {
                console.error("KC Agent Wrapper: Input context is missing.");
                return { messages: [new AIMessage("Error: Input context missing for KC agent.")] };
            }

            const initialState: KcGraphState = {
                messages: input.messages, // Start with the input message history
                inputContext: context, // Store the context passed in the input
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

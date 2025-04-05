import { ChatOpenAI } from '@langchain/openai'; // Keep import for type
// Remove ConfigService import if no longer needed here
// import { ConfigService } from '@nestjs/config';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { DynamicStructuredTool } from '@langchain/core/tools'; // Use DynamicStructuredTool

// --- Configuration ---
// Model instantiation is moved to the service where it can be properly managed/injected.

// --- Agent Creation Helper ---
/**
 * Creates a feedback agent using createReactAgent.
 * @param name The name of the agent (e.g., 'KC', 'KH').
 * @param systemPrompt The system prompt defining the agent's role and task.
 * @param llm The ChatOpenAI model instance.
 * @param tools An optional array of LangChain tools the agent can use.
 * @returns A compiled LangGraph agent runnable.
 */
export function createFeedbackAgent(
  name: string,
  systemPrompt: string,
  llm: ChatOpenAI, // Add llm parameter
  tools: DynamicStructuredTool[] = [], // Use DynamicStructuredTool type
) {
  // Remove the API key check here, as the llm instance is passed in and assumed valid
  return createReactAgent({
    llm: llm, // Use the passed llm
    tools: tools,
    name: name,
    prompt: systemPrompt,
  });
}

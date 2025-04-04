import { ChatOpenAI } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

// --- Configuration ---
// TODO: Inject ConfigService properly in a NestJS context instead of direct instantiation
// This setup assumes OPENAI_API_KEY is available in the environment where the service runs.
// For a more robust NestJS integration, model and config should be managed via providers.
const configService = new ConfigService();
export const model = new ChatOpenAI({
  modelName: 'gpt-4o', // Or configure via environment variable
  apiKey: configService.get<string>('OPENAI_API_KEY'),
  temperature: 0.7, // Adjust as needed for feedback generation
});

// --- Agent Creation Helper ---
/**
 * Creates a feedback agent using createReactAgent.
 * @param name The name of the agent (e.g., 'KR', 'KP').
 * @param systemPrompt The system prompt defining the agent's role and task.
 * @param tools An optional array of LangChain tools the agent can use.
 * @returns A compiled LangGraph agent.
 */
export function createFeedbackAgent(
  name: string,
  systemPrompt: string,
  tools: any[] = [], // Add optional tools parameter
) {
  // Ensure the model is initialized before creating agents
  if (!model.apiKey) {
    console.warn(`API key for agent ${name} is missing. Agent might not function.`);
    // Optionally throw an error or handle differently
  }
  return createReactAgent({
    llm: model,
    tools: tools, // Pass provided tools
    name: name,
    prompt: systemPrompt,
  });
}

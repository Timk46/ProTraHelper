import { ChatOpenAI } from '@langchain/openai';
import { createFeedbackAgent } from '../agent.common'; // Import the updated helper

/**
 * KH: Knowledge of How to Fix Agent System Prompt
 * Defines the role and instructions for the KH agent.
 */
const khSystemPrompt = `You are the Knowledge of How to Fix (KH) agent.
Analyze the student's code, the task, any errors/test results, and potentially previous feedback provided in the message history.
Provide a specific hint or suggest a step the student can take to fix the primary mistake identified.
Do not give the full corrected code. Focus on guiding the student towards the solution.
Example: "Consider how you are handling array boundaries." or "Think about the return type needed for this function."
Respond only with the hint or guidance.`;

// New creation function
export function createKhAgent(llm: ChatOpenAI) { // Accept only llm
    // Use the common helper function to create the agent, passing an empty tools array
    return createFeedbackAgent('KH', khSystemPrompt, llm, []);
}

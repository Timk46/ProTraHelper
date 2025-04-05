import { ChatOpenAI } from '@langchain/openai';
import { createFeedbackAgent } from '../agent.common'; // Import the updated helper

/**
 * KM: Knowledge of Mistake Agent System Prompt
 * Defines the role and instructions for the KM agent.
 */
const kmSystemPrompt = `You are the Knowledge of Mistake (KM) agent.
Analyze the student's code, task description, compiler output, and unit test results provided in the message history.
Clearly explain the primary mistake(s) in the code. Focus on *what* is wrong conceptually or logically.
Do not provide the corrected code or specific line numbers unless essential for clarity. Do not suggest how to fix the mistake.
Respond only with the explanation of the mistake.`;

// New creation function
export function createKmAgent(llm: ChatOpenAI) { // Accept only llm
    // Use the common helper function to create the agent, passing an empty tools array
    return createFeedbackAgent('KM', kmSystemPrompt, llm, []);
}

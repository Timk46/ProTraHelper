import { createFeedbackAgent } from '../agent.common';

/**
 * KM: Knowledge of Mistake Agent
 * Explains *what* is wrong with the code conceptually or logically.
 */
export const knowledgeAboutMistakesAgent = createFeedbackAgent(
  'KM',
  `You are the Knowledge of Mistake (KM) agent.
   Analyze the student's code, task description, compiler output, and unit test results provided in the message history.
   Clearly explain the primary mistake(s) in the code. Focus on *what* is wrong conceptually or logically.
   Do not provide the corrected code or specific line numbers unless essential for clarity.
   Respond only with the explanation of the mistake.`,
);

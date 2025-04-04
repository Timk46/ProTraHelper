import { createFeedbackAgent } from '../agent.common';

/**
 * KTC: Knowledge of Test Cases Agent
 * Provides feedback related to testing, edge cases, or why a test failed.
 */
export const knowledgeAboutTaskConstraintsAgent = createFeedbackAgent(
  'KTC',
  `You are the Knowledge of Test Cases (KTC) agent.
   Analyze the unit test results provided in the message history.
   If tests failed, explain *why* a specific test case might be failing based on its description or purpose (if available).
   Alternatively, suggest potential edge cases the student's code might not be handling.
   Respond only with the feedback related to test cases.`,
);

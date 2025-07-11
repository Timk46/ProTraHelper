import type { ChatOpenAI } from '@langchain/openai';
import type { FeedbackContextDto } from '@DTOs/tutorKaiDtos/feedbackContext.dto';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import type { Runnable } from '@langchain/core/runnables';
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { khSystemPrompt } from './kh.prompts'; // Import prompt from the new file

/**
 * Builds the core KH agent runnable (without input formatting).
 */
export function buildKhCoreAgent(llm: ChatOpenAI): Runnable<any, any> {
  return createReactAgent({
    llm: llm,
    tools: [], // KH agent doesn't use tools
    name: 'KH',
    prompt: khSystemPrompt,
  });
}

/**
 * Builds the complete KH agent chain, including input formatting.
 */
export function buildKhAgentChain(llm: ChatOpenAI): RunnableSequence {
  const inputFormatter = new RunnableLambda({
    func: (input: FeedbackContextDto) => {
      const contextMessageContent = `
## Attempt number
${input.attemptCount}

## Task Description
${input.taskDescription}

## Provided Code Skeleton(s)
 ${JSON.stringify(input.codeGerueste) || 'None'}

## Model Solution (there might be different correct solutions which pass the tests)
 ${JSON.stringify(input.modelSolution) || 'None'}

## Student Solution:
${input.studentSolution}

## Compiler Output:
${input.compilerOutput || 'None'}

## Unit-Tests:
### Unit Tests Definition (all need to pass to successfully complete the task)
${JSON.stringify(input.automatedTests) || 'None'}

### Unit Tests Results
${JSON.stringify(input.unitTestResults) || 'None'}

Generate feedback in german strictly adhering to the KH type and all constraints in your instructions.
`;
      const initialMessages: BaseMessage[] = [new HumanMessage(contextMessageContent)];
      return { messages: initialMessages };
    },
  }).withConfig({ runName: 'FormatKhAgentInput' });

  const coreAgent = buildKhCoreAgent(llm);

  return RunnableSequence.from([inputFormatter, coreAgent], 'KhAgentChain');
}

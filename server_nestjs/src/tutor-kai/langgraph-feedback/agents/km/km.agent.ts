import { ChatOpenAI } from '@langchain/openai';
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/feedbackContext.dto';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Runnable, RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { kmSystemPrompt } from './km.prompts'; // Import prompt from the new file

/**
 * Builds the core KM agent runnable (without input formatting).
 */
export function buildKmCoreAgent(llm: ChatOpenAI): Runnable<any, any> {
    return createReactAgent({
        llm: llm,
        tools: [], // KM agent doesn't use tools
        name: 'KM',
        prompt: kmSystemPrompt,
    });
}

/**
 * Builds the complete KM agent chain, including input formatting.
 */
export function buildKmAgentChain(llm: ChatOpenAI): RunnableSequence {
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

Generate feedback in german based *only* on the mistakes identified in your analysis, strictly adhering to the KM type and all constraints in your instructions.
`;
            const initialMessages: BaseMessage[] = [new HumanMessage(contextMessageContent)];
            return { messages: initialMessages };
        },
    }).withConfig({ runName: 'FormatKmAgentInput' });

    const coreAgent = buildKmCoreAgent(llm);

    return RunnableSequence.from([inputFormatter, coreAgent], 'KmAgentChain');
}

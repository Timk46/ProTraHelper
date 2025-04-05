import { ChatOpenAI } from '@langchain/openai';
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/FeedbackContext.dto';
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
Analyze my solution for the following task. This is attempt number ${input.attemptCount}.
Task Description: ${input.taskDescription}
Provided Code Skeleton(s): ${JSON.stringify(input.codeGerueste) || 'None'}
My Solution:
\`\`\`
${input.studentSolution}
\`\`\`
Compiler Output: ${input.compilerOutput || 'None'}
Automated Tests Definition: ${JSON.stringify(input.automatedTests) || 'None'}
Unit Test Results: ${JSON.stringify(input.unitTestResults) || 'None'}
\`\`\`
Generate feedback in german based *only* on the mistakes identified in your analysis, strictly adhering to the KM type and all constraints in your instructions.
`;
            const initialMessages: BaseMessage[] = [new HumanMessage(contextMessageContent)];
            return { messages: initialMessages };
        },
    }).withConfig({ runName: 'FormatKmAgentInput' });

    const coreAgent = buildKmCoreAgent(llm);

    return RunnableSequence.from([inputFormatter, coreAgent], 'KmAgentChain');
}

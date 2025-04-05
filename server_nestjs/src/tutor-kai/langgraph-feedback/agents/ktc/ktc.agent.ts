import { ChatOpenAI } from '@langchain/openai';
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/FeedbackContext.dto';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Runnable, RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ktcSystemPrompt } from './ktc.prompts'; // Import prompt from the new file

/**
 * Builds the core KTC agent runnable (without input formatting).
 */
export function buildKtcCoreAgent(llm: ChatOpenAI): Runnable<any, any> {
    return createReactAgent({
        llm: llm,
        tools: [], // KTC agent doesn't use tools
        name: 'KTC',
        prompt: ktcSystemPrompt,
    });
}

/**
 * Builds the complete KTC agent chain, including input formatting.
 */
export function buildKtcAgentChain(llm: ChatOpenAI): RunnableSequence {
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
Generate feedback in german strictly adhering to the KTC type and all constraints in your instructions.
`;
            const initialMessages: BaseMessage[] = [new HumanMessage(contextMessageContent)];
            return { messages: initialMessages };
        },
    }).withConfig({ runName: 'FormatKtcAgentInput' });

    const coreAgent = buildKtcCoreAgent(llm);

    return RunnableSequence.from([inputFormatter, coreAgent], 'KtcAgentChain');
}

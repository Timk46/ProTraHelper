import { ChatOpenAI } from '@langchain/openai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { FeedbackContextDto } from '@DTOs/tutorKaiDtos/FeedbackContext.dto';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Runnable, RunnableLambda, RunnableSequence } from '@langchain/core/runnables'; // Import Runnable type
import { createReactAgent } from '@langchain/langgraph/prebuilt'; // Use createReactAgent directly
import { kcSystemPrompt } from './kc.prompts'; // Import prompt from the new file

/**
 * Builds the core KC agent runnable (without input formatting).
 * This is intended for use within the LangGraph workflow where formatting happens in a prior node.
 * @param llm The ChatOpenAI model instance.
 * @param tools An array of tools the agent can use.
 * @returns A Runnable representing the core KC agent.
 */
export function buildKcCoreAgent(llm: ChatOpenAI, tools: DynamicStructuredTool[]): Runnable<any, any> {
     // Create the core agent runnable using createReactAgent directly
    return createReactAgent({
        llm: llm,
        tools: tools,
        name: 'KC', // Agent name
        prompt: kcSystemPrompt, // Use imported prompt
    });
}


/**
 * Builds the complete KC agent chain, including input formatting.
 * This is intended for direct invocation.
 * @param llm The ChatOpenAI model instance.
 * @param tools An array of tools the agent can use (e.g., DomainKnowledgeTool).
 * @param llm The ChatOpenAI model instance.
 * @param tools An array of tools the agent can use.
 * @returns A RunnableSequence representing the KC agent chain.
 */
export function buildKcAgentChain(llm: ChatOpenAI, tools: DynamicStructuredTool[]): RunnableSequence {
    // 1. Define the input formatter lambda
    const inputFormatter = new RunnableLambda({
        func: (input: FeedbackContextDto) => {
            // Format the context into the initial message string
            // Format the context into the initial message string
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
`;
            const initialMessages: BaseMessage[] = [new HumanMessage(contextMessageContent)];
            // Return the input expected by the core agent
            return { messages: initialMessages };
        },
    }).withConfig({ runName: 'FormatKcAgentInput' });

    // 2. Create the core agent runnable using the dedicated builder function
    const coreAgent = buildKcCoreAgent(llm, tools);

    // 3. Return the sequence: formatter -> core agent
    return RunnableSequence.from([inputFormatter, coreAgent], 'KcAgentChain');
}

// Note: Instantiation is handled by the provider (kc.provider.ts)

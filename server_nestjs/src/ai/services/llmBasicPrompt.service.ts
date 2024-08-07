
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Response } from 'express';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { RagService } from './rag.service';
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "langchain/prompts";

const llm = new ChatOpenAI({
  modelName: 'gpt-4o-2024-08-06', // other options: 'gpt-4-1106-preview', 'gpt-4-0314', 'gpt-3.5-turbo'
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0, // Low Temperature favours the words with higher probability = less creative
  streaming: true
});

// Notes:
// Just basic general question/answer prompts
// How to do function calling is implemented in the tutor-kai repo
// How to force structured json output can be read here: https://js.langchain.com/docs/modules/model_io/output_parsers/

@Injectable()
export class LlmBasicPromptService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private ragService: RagService,
  ) {}

  /**
   * Generates an LLM answer based on the system message and prompt.
   * @param systemMessage The system message to be included in the prompt.
   * @param prompt The user message to include in the prompt.
   * @returns A Promise String that resolves to the generated LLM answer.
   */
  async generateLlmAnswer( systemMessage: string, prompt: string ): Promise<string> {
    const systemMessagePrompt = SystemMessagePromptTemplate.fromTemplate(systemMessage);
    const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(prompt);
    const chatPrompt = ChatPromptTemplate.fromMessages<{
    }>([systemMessagePrompt, humanMessagePrompt]);

    const formattedChatPrompt = await chatPrompt.formatPromptValue({})
    const openAiResponse = await llm.generatePrompt([formattedChatPrompt]);
    return openAiResponse.generations[0][0].text;
  }

  /**
   * Streams the LLM answer to the client.
   *
   * @param systemMessage - The system message to include in the prompt.
   * @param prompt - The user message to include in the prompt.
   * @param res - The response object (@Res() res: Response) from the controller.
   * @returns A Promise that resolves when the streaming is complete.
   */
  async streamLlmAnswer( systemMessage: string, prompt: string, res: Response,): Promise<void> {
    // Note: // we dont really need the templates here, but they become useful once the prompt gets more complex (e.g. few shot prompts: https://js.langchain.com/docs/modules/model_io/prompts/prompt_templates/few_shot)
    const systemMessagePrompt = SystemMessagePromptTemplate.fromTemplate(systemMessage);
    const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(prompt);
    const chatPrompt = ChatPromptTemplate.fromMessages<{ // Because we use TypeScript, we can add typing to prompts created with .fromMessages by passing a type parameter like this
      // placeholder: string;
      // ...
    }>([systemMessagePrompt, humanMessagePrompt]);

    const formattedChatPrompt = await chatPrompt.formatPromptValue({}) // Insert Parameter to Placeholders in Prompts. Currently we dont have any.

    const openAiResponse = await llm.generatePrompt([formattedChatPrompt], undefined, [
      { // Request Callbacks for streaming (see here: https://js.langchain.com/docs/modules/callbacks/)
        ignoreAgent: true,
        ignoreChain: true,
        handleLLMNewToken(token: string) {
          res.write(token);
        },
      },
    ],
    );
    res.end();
  }
}


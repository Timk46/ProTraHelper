import { Injectable } from '@nestjs/common';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage, } from 'langchain/schema';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { TUTOR_INSTRUCTIONS } from './system-message';
import { editorDataDTO } from '@DTOs/index';


@Injectable()
export class GptService {
  private readonly chat: ChatOpenAI;

  constructor() {
    this.chat = new ChatOpenAI({
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo-1106',
      maxTokens: 4096,
    });
  }

  /**
   * Sends a feedback request to the GPT chatbot.
   * @param solution - The solution provided by the user.
   * @param attempt - The user's attempt at solving the problem.
   * @returns A promise that resolves to an object containing the GPT feedback.
   */
  async sendFeedbackRequest(solution: editorDataDTO, attempt: editorDataDTO): Promise<{gptFeedback: string}>  {
    const requestPack: BaseMessage[] = [];
    requestPack.push(new SystemMessage(TUTOR_INSTRUCTIONS));
    requestPack.push(new HumanMessage(JSON.stringify(solution)));
    requestPack.push(new HumanMessage(JSON.stringify(attempt)));

    const responsePack: BaseMessage = await this.chat.predictMessages(requestPack);
    let messageText = '';
    if (responsePack) {
      if (typeof responsePack.content === 'string') {
        messageText = responsePack.content;
      } else if (Array.isArray(responsePack.content)) {
        responsePack.content.forEach(item => {
          if (item.type === 'text') {
            messageText += item.text;
          }
        });
      }
      console.log(messageText);
    }
    return {gptFeedback: messageText};
  }

}

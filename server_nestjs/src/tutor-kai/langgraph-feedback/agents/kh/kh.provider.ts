import { Injectable, Inject } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { CHAT_OPENAI_MODEL } from '../../langgraph.constants'; // Import token from constants file
import { buildKhAgentChain } from './kh.agent'; // Import the chain builder

@Injectable()
export class KhAgentProvider {
  constructor(
    @Inject(CHAT_OPENAI_MODEL) private readonly model: ChatOpenAI, // No tool services needed for KH agent
  ) {}

  /**
   * Gets a fully configured instance of the KH agent chain.
   */
  getAgentChain(): RunnableSequence {
    // KH agent doesn't need tools
    return buildKhAgentChain(this.model);
  }
}

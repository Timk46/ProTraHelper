import { Injectable, Inject } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import type { RunnableSequence } from '@langchain/core/runnables';
import { CHAT_OPENAI_MODEL } from '../../langgraph.constants'; // Import token from constants file
import { buildKmAgentChain } from './km.agent'; // Import the chain builder

@Injectable()
export class KmAgentProvider {
  constructor(
    @Inject(CHAT_OPENAI_MODEL) private readonly model: ChatOpenAI, // No tool services needed for KM agent
  ) {}

  /**
   * Gets a fully configured instance of the KM agent chain.
   */
  getAgentChain(): RunnableSequence {
    // KM agent doesn't need tools
    return buildKmAgentChain(this.model);
  }
}

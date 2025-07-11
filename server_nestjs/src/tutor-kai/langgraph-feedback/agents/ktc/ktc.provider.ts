import { Injectable, Inject } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import type { RunnableSequence } from '@langchain/core/runnables';
import { CHAT_OPENAI_MODEL } from '../../langgraph.constants'; // Import token from constants file
import { buildKtcAgentChain } from './ktc.agent'; // Import the chain builder

@Injectable()
export class KtcAgentProvider {
  constructor(
    @Inject(CHAT_OPENAI_MODEL) private readonly model: ChatOpenAI, // No tool services needed for KTC agent
  ) {}

  /**
   * Gets a fully configured instance of the KTC agent chain.
   */
  getAgentChain(): RunnableSequence {
    // KTC agent doesn't need tools
    return buildKtcAgentChain(this.model);
  }
}

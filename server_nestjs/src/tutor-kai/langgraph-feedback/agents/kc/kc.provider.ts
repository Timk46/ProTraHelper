import { Injectable, Inject } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import type { Runnable } from '@langchain/core/runnables'; // Import Runnable instead of RunnableSequence
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { DomainKnowledgeService } from '../../tools/domain-knowledge/domain-knowledge.service';
import { createDomainKnowledgeTool } from '../../tools/domain-knowledge/domain-knowledge.tool';
import { CHAT_OPENAI_MODEL } from '../../langgraph.constants'; // Import token from constants file
import { buildKcCoreAgent } from './kc.agent'; // Import the core agent builder

@Injectable()
export class KcAgentProvider {
  private readonly domainKnowledgeTool: DynamicStructuredTool;

  constructor(
    @Inject(CHAT_OPENAI_MODEL) private readonly model: ChatOpenAI,
    private readonly domainKnowledgeService: DomainKnowledgeService,
  ) {
    // Instantiate the tool needed by this agent
    this.domainKnowledgeTool = createDomainKnowledgeTool(this.domainKnowledgeService);
  }

  /**
   * Gets a fully configured instance of the KC core agent runnable.
   */
  getAgentRunnable(): Runnable<any, any> {
    // Changed method name and return type
    return buildKcCoreAgent(this.model, [this.domainKnowledgeTool]); // Call the correct builder
  }
}

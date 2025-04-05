import { Injectable, Inject } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { DomainKnowledgeService } from '../../tools/domain-knowledge/domain-knowledge.service';
import { createDomainKnowledgeTool } from '../../tools/domain-knowledge/domain-knowledge.tool';
import { CHAT_OPENAI_MODEL } from '../../langgraph-feedback.module'; // Import provider token
import { buildKcAgentChain } from './kc.agent'; // Import the chain builder

@Injectable()
export class KcAgentProvider {
  private domainKnowledgeTool: DynamicStructuredTool;

  constructor(
    @Inject(CHAT_OPENAI_MODEL) private readonly model: ChatOpenAI,
    private readonly domainKnowledgeService: DomainKnowledgeService,
  ) {
    // Instantiate the tool needed by this agent
    this.domainKnowledgeTool = createDomainKnowledgeTool(this.domainKnowledgeService);
  }

  /**
   * Gets a fully configured instance of the KC agent chain.
   */
  getAgentChain(): RunnableSequence {
    return buildKcAgentChain(this.model, [this.domainKnowledgeTool]);
  }
}

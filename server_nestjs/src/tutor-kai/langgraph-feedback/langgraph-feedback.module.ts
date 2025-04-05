import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module'; // Assuming standard path
import { CryptoService } from '../crypto/crypto.service'; // Path relative to this module
// Removed duplicate imports below
import { LanggraphFeedbackController } from './langgraph-feedback.controller';
import { LanggraphFeedbackService } from './langgraph-feedback.service'; // Facade service
// Remove DirectAgentService import
import { LanggraphDataFetcherService } from './helper/langgraph-data-fetcher.service';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigService for factory
import { DomainKnowledgeService } from './tools/domain-knowledge/domain-knowledge.service'; // Import the service
// Import new providers and workflow service
import { SupervisorWorkflowService } from './agents/supervisor/supervisor.workflow';
import { KcAgentProvider } from './agents/kc/kc.provider';
import { KhAgentProvider } from './agents/kh/kh.provider';
import { KmAgentProvider } from './agents/km/km.provider';
import { KtcAgentProvider } from './agents/ktc/ktc.provider';
import { ChatOpenAI } from '@langchain/openai'; // Import ChatOpenAI for provider
import { CHAT_OPENAI_MODEL } from './langgraph.constants'; // Import token from constants file

// Token definition moved to langgraph.constants.ts

@Module({
  imports: [
    PrismaModule,
    ConfigModule, // Import ConfigModule as dependencies need ConfigService
  ],
  controllers: [LanggraphFeedbackController],
  providers: [
    // Shared LLM Model Provider (Define BEFORE services that inject it)
    {
      provide: CHAT_OPENAI_MODEL,
      useFactory: (configService: ConfigService) => {
        const openAIApiKey = configService.get<string>('OPENAI_API_KEY');
        if (!openAIApiKey) {
          throw new Error('OPENAI_API_KEY is not configured for ChatOpenAI provider.');
        }
        return new ChatOpenAI({
          modelName: 'gpt-4o', // Or fetch from config
          apiKey: openAIApiKey,
          temperature: 0.2, // Or fetch from config
        });
      },
      inject: [ConfigService], // Inject ConfigService into the factory
    },
    // Helper/Tool Services (Define BEFORE services that inject them)
    LanggraphDataFetcherService,
    CryptoService,
    DomainKnowledgeService,
    // Agent Providers (Depend on Model and potentially Tool Services)
    KcAgentProvider,
    KhAgentProvider,
    KmAgentProvider,
    KtcAgentProvider,
    // Workflow Service (Depends on Model and potentially Agent Providers/Tool Services)
    SupervisorWorkflowService,
    // Facade Service (Depends on Workflow Service and Agent Providers)
    LanggraphFeedbackService,
  ],
  exports: [
    LanggraphFeedbackService, // Export the facade service
    // No need to export providers or workflow service unless used by other modules directly
  ],
})
export class LanggraphFeedbackModule {}

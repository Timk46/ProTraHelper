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

// Define a constant for the provider token
export const CHAT_OPENAI_MODEL = 'CHAT_OPENAI_MODEL';

@Module({
  imports: [
    PrismaModule,
    ConfigModule, // Import ConfigModule as LanggraphFeedbackService depends on ConfigService
  ],
  controllers: [LanggraphFeedbackController],
  providers: [
    // Facade Service
    LanggraphFeedbackService,
    // Workflow Service
    SupervisorWorkflowService,
    // Agent Providers
    KcAgentProvider,
    KhAgentProvider,
    KmAgentProvider,
    KtcAgentProvider,
    // Helper/Tool Services
    LanggraphDataFetcherService,
    CryptoService,
    DomainKnowledgeService,
    // Shared LLM Model Provider
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
  ],
  exports: [
    LanggraphFeedbackService, // Export the facade service
    // No need to export providers or workflow service unless used by other modules directly
  ],
})
export class LanggraphFeedbackModule {}

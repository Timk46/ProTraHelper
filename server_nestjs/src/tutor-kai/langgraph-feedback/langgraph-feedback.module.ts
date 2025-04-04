import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module'; // Assuming standard path
import { CryptoService } from '../crypto/crypto.service'; // Path relative to this module
import { LanggraphFeedbackController } from './langgraph-feedback.controller';
import { LanggraphFeedbackService } from './langgraph-feedback.service';
import { LanggraphDataFetcherService } from './langgraph-data-fetcher.service';
import { ConfigModule } from '@nestjs/config'; // LanggraphFeedbackService needs ConfigService

@Module({
  imports: [
    PrismaModule,
    ConfigModule, // Import ConfigModule as LanggraphFeedbackService depends on ConfigService
  ],
  controllers: [LanggraphFeedbackController],
  providers: [
    LanggraphFeedbackService,
    LanggraphDataFetcherService,
    CryptoService, // Provide CryptoService directly here
  ],
  exports: [
    LanggraphDataFetcherService, // Export if needed by other modules
    LanggraphFeedbackService, // Export if needed by other modules
  ],
})
export class LanggraphFeedbackModule {}

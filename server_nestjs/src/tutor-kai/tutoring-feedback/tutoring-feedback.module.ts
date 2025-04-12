import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LanggraphFeedbackModule } from '../langgraph-feedback/langgraph-feedback.module';
import { PrismaModule } from 'src/prisma/prisma.module'; // Import PrismaModule
import { TutoringFeedbackService } from './tutoring-feedback.service';
import { TutoringFeedbackController } from './tutoring-feedback.controller';
import { GraphBuilderService } from './graph/graph.builder.service';
import { GenerateFixedCodeNodeService } from './graph/nodes/generate-fixed-code.node.service';
// Removed ExtractConceptsNodeService and FetchLectureSnippetsNodeService
import { ExtractAndFetchNodeService } from './graph/nodes/extract-and-fetch.node.service'; // Added combined node
import { GenerateFinalFeedbackNodeService } from './graph/nodes/generate-final-feedback.node.service';

@Module({
  imports: [
    ConfigModule, // Needed for ConfigService injection in TutoringFeedbackService
    LanggraphFeedbackModule,
    PrismaModule, // Add PrismaModule to imports
  ],
  controllers: [TutoringFeedbackController],
  providers: [
    TutoringFeedbackService,
    GraphBuilderService,
    GenerateFixedCodeNodeService,
    // Removed ExtractConceptsNodeService and FetchLectureSnippetsNodeService
    ExtractAndFetchNodeService, // Added combined node service
    GenerateFinalFeedbackNodeService,
    // DomainKnowledgeService is likely provided by LanggraphFeedbackModule
  ],
  exports: [TutoringFeedbackService], // Export if needed by other modules
})
export class TutoringFeedbackModule {}

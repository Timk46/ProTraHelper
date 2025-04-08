import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule
import { LanggraphFeedbackModule } from '../langgraph-feedback/langgraph-feedback.module'; // Import the module providing DomainKnowledgeService
import { TutoringFeedbackService } from './tutoring-feedback.service';
import { TutoringFeedbackController } from './tutoring-feedback.controller';
import { GraphBuilderService } from './graph/graph.builder.service';
import { GenerateFixedCodeNodeService } from './graph/nodes/generate-fixed-code.node.service';
import { ExtractConceptsNodeService } from './graph/nodes/extract-concepts.node.service';
import { FetchLectureSnippetsNodeService } from './graph/nodes/fetch-lecture-snippets.node.service';
import { GenerateFinalFeedbackNodeService } from './graph/nodes/generate-final-feedback.node.service';

@Module({
  imports: [
    ConfigModule, // Needed for ConfigService injection in TutoringFeedbackService
    LanggraphFeedbackModule, // Import to access exported providers like DomainKnowledgeService
  ],
  controllers: [TutoringFeedbackController],
  providers: [
    TutoringFeedbackService,
    GraphBuilderService,
    GenerateFixedCodeNodeService,
    ExtractConceptsNodeService,
    FetchLectureSnippetsNodeService,
    GenerateFinalFeedbackNodeService,
    // DomainKnowledgeService is likely provided by LanggraphFeedbackModule
  ],
  exports: [TutoringFeedbackService], // Export if needed by other modules
})
export class TutoringFeedbackModule {}

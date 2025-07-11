import { forwardRef, Module } from '@nestjs/common';
import { AiFeedbackService } from './ai-feedback.service';
import { AiFeedbackController } from './ai-feedback.controller';
import { PrismaService } from '@/prisma/prisma.service';
import { GraphSolutionEvaluationModule } from '../graph-solution-evaluation.module';
import { FeedbackGenerationModule } from '@/ai/feedback-generation/feedback-generation.module';

@Module({
  imports: [forwardRef(() => GraphSolutionEvaluationModule), FeedbackGenerationModule],
  controllers: [AiFeedbackController],
  providers: [AiFeedbackService, PrismaService],
})
export class AiFeedbackModule {}

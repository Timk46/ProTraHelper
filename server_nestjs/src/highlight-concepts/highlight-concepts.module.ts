import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HighlightConceptsController } from './highlight-concepts.controller';
import { HighlightConceptsService } from './highlight-concepts.service';

@Module({
  imports: [PrismaModule],
  controllers: [HighlightConceptsController],
  providers: [HighlightConceptsService],
  exports: [HighlightConceptsService],
})
export class HighlightConceptsModule {}

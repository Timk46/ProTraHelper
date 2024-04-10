import { PrismaModule } from '../prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { UserConceptModule } from '@/graph/user-concept/user-concept.module';
import { UserConceptService } from '@/graph/user-concept/user-concept.service';

@Module({
  imports: [PrismaModule, UserConceptModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}

/* eslint-disable prettier/prettier */
import { PrismaModule } from '../prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { UserConceptModule } from '@/graph/user-concept/user-concept.module';


@Module({
  imports: [PrismaModule, UserConceptModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}

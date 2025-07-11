import { Module } from '@nestjs/common';
import { DatabaseEditorCommunicationController } from './database-editor-communication.controller';
import { DatabaseEditorCommunicationService } from './database-editor-communication.service';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  controllers: [DatabaseEditorCommunicationController],
  providers: [DatabaseEditorCommunicationService, PrismaService],
})
export class DatabaseEditorCommunicationModule {}

import { Module } from '@nestjs/common';
import { DatabaseTaskCommunicationService } from './database-task-communication.service';
import { DatabaseTaskCommunicationController } from './database-task-communication.controller';
import { PrismaService } from '@/prisma/prisma.service';
import { CompareService } from '../compare/compare.service';

@Module({
  providers: [DatabaseTaskCommunicationService, PrismaService, CompareService],
  controllers: [DatabaseTaskCommunicationController]
})
export class DatabaseTaskCommunicationModule {}

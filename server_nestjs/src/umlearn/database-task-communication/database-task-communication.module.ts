import { Module } from '@nestjs/common';
import { DatabaseTaskCommunicationService } from './database-task-communication.service';
import { DatabaseTaskCommunicationController } from './database-task-communication.controller';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  providers: [DatabaseTaskCommunicationService, PrismaService],
  controllers: [DatabaseTaskCommunicationController]
})
export class DatabaseTaskCommunicationModule {}

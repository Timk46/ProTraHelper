import { Module } from '@nestjs/common';
import { DatabaseTaskCommunicationService } from './database-task-communication.service';
import { DatabaseTaskCommunicationController } from './database-task-communication.controller';
import { PrismaService } from '@/prisma/prisma.service';
import { CompareModule } from '../compare/compare.module';

@Module({
  imports: [CompareModule],
  providers: [DatabaseTaskCommunicationService, PrismaService],
  controllers: [DatabaseTaskCommunicationController]
})
export class DatabaseTaskCommunicationModule {}

import { Module } from '@nestjs/common';
import { DatabaseCourseCommunicationController } from './database-course-communication.controller';
import { DatabaseCourseCommunicationService } from './database-course-communication.service';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  controllers: [DatabaseCourseCommunicationController],
  providers: [DatabaseCourseCommunicationService, PrismaService]
})
export class DatabaseCourseCommunicationModule {}

import { Module } from '@nestjs/common';
import { ContentManagementController } from './controllers/content-management.controller';
import { ContentManagementService } from './services/content-management.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ContentManagementController],
  providers: [ContentManagementService, PrismaService]
})
export class AdminModule {}

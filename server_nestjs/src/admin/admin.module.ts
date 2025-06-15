import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '@/users/users.module';

import { ContentManagementController } from './content-management.controller';
import { ContentManagementService } from './content-management.service';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [AdminController, ContentManagementController],
  providers: [AdminService, ContentManagementService],
})
export class AdminModule {}

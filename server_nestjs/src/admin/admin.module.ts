import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '@/users/users.module';

import { ContentManagementController } from './content-management.controller';
import { ContentManagementService } from './content-management.service';
import { ModuleSettingsController } from './module-settings.controller';
import { ModuleSettingsService } from './module-settings.service';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [AdminController, ContentManagementController, ModuleSettingsController],
  providers: [AdminService, ContentManagementService, ModuleSettingsService],
})
export class AdminModule {}

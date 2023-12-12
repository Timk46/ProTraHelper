import { Module } from '@nestjs/common';
import { TaskOverviewService } from './task-overview.service';
import { TaskOverviewController } from './task-overview.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  providers: [TaskOverviewService],
  controllers: [TaskOverviewController],
  imports: [PrismaModule],
})
export class TaskOverviewModule { }

import { Module } from '@nestjs/common';
import { UserConceptController } from './user-concept.controller';
import { UserConceptService } from './user-concept.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  controllers: [UserConceptController],
  imports: [PrismaModule, NotificationModule],
  providers: [UserConceptService],
  exports: [UserConceptService],
})
export class UserConceptModule {}

/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import EventEmitter2 from 'eventemitter2';

@Module({
  providers: [NotificationGateway, NotificationService, JwtService, PrismaService],
  controllers: [NotificationController],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}

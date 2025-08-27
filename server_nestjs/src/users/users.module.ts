import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from '@/notification/notification.module';
import { UserModuleController } from './userModule.controller';
import { UserModuleService } from './userModule.service';

@Module({
  providers: [UsersService, UserModuleService],
  controllers: [UsersController, UserModuleController],
  imports: [
    NotificationModule,
    PrismaModule,
    ConfigModule.forRoot({ envFilePath: ['.env', '.env.auth'] }),
  ],
  exports: [UsersService, UserModuleService],
})
export class UsersModule {}

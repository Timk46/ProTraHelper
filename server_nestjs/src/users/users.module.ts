import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [UsersService],
  controllers: [UsersController],
  imports: [
    PrismaModule,
    ConfigModule.forRoot({ envFilePath: ['.env', '.env.auth'] }),
  ],
  exports: [UsersService],
})
export class UsersModule {}

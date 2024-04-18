import { PrismaModule } from '../prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { UserConceptModule } from '@/graph/user-concept/user-concept.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { VersionInterceptor } from '@/common/interceptors/version.interceptor';

@Module({
  imports: [PrismaModule, UserConceptModule],
  controllers: [ContentController],
  providers: [
    ContentService
  ],
})
export class ContentModule {}

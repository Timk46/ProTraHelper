import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [ContentService],
  imports: [PrismaModule],
  controllers: [ContentController]
})
export class ContentModule {}

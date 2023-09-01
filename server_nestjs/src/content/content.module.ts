import { PrismaModule } from '../prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';

@Module({
    imports: [PrismaModule],
    controllers: [ContentController],
    providers: [ContentService],
})
export class ContentModule {}

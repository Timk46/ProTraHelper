import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  providers: [FilesService],
  imports: [PrismaModule],
  controllers: [FilesController],
})
export class FilesModule {}

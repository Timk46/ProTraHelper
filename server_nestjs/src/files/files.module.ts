import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { ProductionFilesService } from './production-files.service';
import { ProductionFilesController } from './production-files.controller';
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  providers: [FilesService, ProductionFilesService],
  imports: [PrismaModule],
  controllers: [FilesController, ProductionFilesController],
  exports: [FilesService, ProductionFilesService],
})
export class FilesModule {}

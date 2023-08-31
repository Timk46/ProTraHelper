import { FilesModule } from './files/files.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphModule } from './graph/graph.module';
import { PrismaModule } from './prisma/prisma.module';
import { ContentModule } from './content/content.module';

@Module({
  imports: [FilesModule, GraphModule, PrismaModule, ContentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { GraphService } from './graph.service';
import { GraphController } from './graph.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserConceptModule } from './user-concept/user-concept.module';

@Module({
  providers: [GraphService],
  imports: [PrismaModule, UserConceptModule],
  controllers: [GraphController]
})
export class GraphModule {}

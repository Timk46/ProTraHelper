import { Module } from '@nestjs/common';
import { UserConceptController } from './user-concept.controller';
import { UserConceptService } from './user-concept.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  controllers: [UserConceptController],
  imports: [PrismaModule],
  providers: [UserConceptService],
  exports: [UserConceptService],
})
export class UserConceptModule {}

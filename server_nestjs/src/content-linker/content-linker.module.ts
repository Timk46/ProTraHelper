import { Module } from '@nestjs/common';
import { ContentLinkerController } from './content-linker.controller';
import { ContentLinkerService } from './content-linker.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { QuestionDataModule } from '@/question-data/question-data.module';

@Module({
  imports: [PrismaModule, QuestionDataModule],
  controllers: [ContentLinkerController],
  providers: [ContentLinkerService],
})
export class ContentLinkerModule {}

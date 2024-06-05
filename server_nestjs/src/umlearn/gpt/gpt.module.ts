import { Module } from '@nestjs/common';
import { GptController } from './gpt.controller';
import { GptService } from './gpt.service';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  controllers: [GptController],
  providers: [GptService, PrismaService]
})
export class GptModule {}

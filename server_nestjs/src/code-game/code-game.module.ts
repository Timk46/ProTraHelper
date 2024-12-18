import { Module } from '@nestjs/common';
import { CodeGameService } from './code-game.service';
import { CodeGameController } from './code-game.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  controllers: [CodeGameController],
  providers: [CodeGameService],
  imports: [PrismaModule],
})
export class CodeGameModule {}

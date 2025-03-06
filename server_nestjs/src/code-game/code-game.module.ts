import { Module } from '@nestjs/common';
import { CodeGameService } from './code-game.service';
import { CodeGameController } from './code-game.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { CodeGameEvaluationService } from './code-game-evaluation/code-game-evaluation.service';

@Module({
  controllers: [CodeGameController],
  providers: [CodeGameService, CodeGameEvaluationService],
  imports: [PrismaModule],
})
export class CodeGameModule {}

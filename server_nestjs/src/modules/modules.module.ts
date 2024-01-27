import { Module } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { ModulesController } from './modules.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  providers: [ModulesService],
  imports: [PrismaModule],
  controllers: [ModulesController],
  exports: [ModulesService]
})
export class ModulesModule {}

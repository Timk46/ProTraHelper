import { Module } from '@nestjs/common';
import { RhinoDirectService } from './rhino-direct.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [RhinoDirectService],
  exports: [RhinoDirectService],
})
export class RhinoDirectModule {}
